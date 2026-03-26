import { useState, useRef, useCallback, useEffect } from 'react';
import { buildSystemPrompt } from '../data/systemPrompt';

/**
 * Hybrid conversational voice agent hook.
 *
 * Uses WebSocket to stream: Claude text → ElevenLabs TTS audio chunks.
 * Web Speech API in continuous mode for auto-listening + barge-in.
 * MediaSource Extensions for real-time streaming audio playback.
 */
export function useConversation({ rep, historyRef, onUserMessage, onAssistantChunk, onAssistantDone }) {
  const [state, setState] = useState('idle');
  const [error, setError] = useState('');

  // Refs to avoid stale closures
  const repRef = useRef(rep);
  const onUserMessageRef = useRef(onUserMessage);
  const onAssistantChunkRef = useRef(onAssistantChunk);
  const onAssistantDoneRef = useRef(onAssistantDone);

  useEffect(() => { repRef.current = rep; }, [rep]);
  useEffect(() => { onUserMessageRef.current = onUserMessage; }, [onUserMessage]);
  useEffect(() => { onAssistantChunkRef.current = onAssistantChunk; }, [onAssistantChunk]);
  useEffect(() => { onAssistantDoneRef.current = onAssistantDone; }, [onAssistantDone]);

  const [muted, setMuted] = useState(false);

  const stateRef = useRef('idle');
  const wsRef = useRef(null);
  const recognitionRef = useRef(null);
  const activeRef = useRef(false);
  const mutedRef = useRef(false);
  const fullTextRef = useRef('');
  const reconnectRef = useRef(0);
  const turnTextRef = useRef('');

  // MSE streaming audio refs
  const audioRef = useRef(null);
  const mediaSourceRef = useRef(null);
  const sourceBufferRef = useRef(null);
  const chunkQueueRef = useRef([]);    // queued ArrayBuffers waiting to be appended
  const audioReadyRef = useRef(false); // sourceBuffer is ready to accept data
  const turnDoneRef = useRef(false);   // server signaled turn_end
  const hasAudioRef = useRef(false);   // received at least one audio chunk

  function setStateSync(s) {
    stateRef.current = s;
    setState(s);
  }

  // ── MSE streaming audio ───────────────────────────────────────────────────────

  function base64ToArrayBuffer(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  function initStreamingAudio() {
    // Clean up any previous instance
    cleanupAudio();

    const mediaSource = new MediaSource();
    const audio = new Audio();
    audio.src = URL.createObjectURL(mediaSource);

    mediaSourceRef.current = mediaSource;
    audioRef.current = audio;
    sourceBufferRef.current = null;
    chunkQueueRef.current = [];
    audioReadyRef.current = false;
    turnDoneRef.current = false;
    hasAudioRef.current = false;

    mediaSource.addEventListener('sourceopen', () => {
      try {
        const sb = mediaSource.addSourceBuffer('audio/mpeg');
        sourceBufferRef.current = sb;
        audioReadyRef.current = true;

        sb.addEventListener('updateend', () => {
          // Append next queued chunk if any
          if (chunkQueueRef.current.length > 0) {
            const next = chunkQueueRef.current.shift();
            try { sb.appendBuffer(next); } catch (e) {
              console.warn('appendBuffer error:', e.message);
            }
          } else if (turnDoneRef.current && mediaSource.readyState === 'open') {
            // All chunks appended, turn is done — end the stream
            try { mediaSource.endOfStream(); } catch {}
          }
        });

        // Flush any chunks that arrived before sourceopen
        flushQueue();
      } catch (e) {
        console.error('MSE init error:', e.message);
        // Fallback: will be handled by turn_end with no audio
      }
    });

    audio.addEventListener('ended', () => {
      onAudioFinished();
    });

    audio.addEventListener('error', () => {
      console.error('Audio element error');
      onAudioFinished();
    });
  }

  function appendAudioChunk(base64Data) {
    hasAudioRef.current = true;
    const buffer = base64ToArrayBuffer(base64Data);

    const sb = sourceBufferRef.current;
    if (sb && audioReadyRef.current && !sb.updating && chunkQueueRef.current.length === 0) {
      try {
        sb.appendBuffer(buffer);
      } catch (e) {
        console.warn('appendBuffer error:', e.message);
        chunkQueueRef.current.push(buffer);
      }
    } else {
      chunkQueueRef.current.push(buffer);
    }

    // Start playback on first chunk — pause mic to prevent echo feedback
    const audio = audioRef.current;
    if (audio && audio.paused && hasAudioRef.current) {
      setStateSync('speaking');
      stopListening(); // ← mute mic while speaking to prevent feedback loop
      audio.play().catch(err => console.warn('Auto-play blocked:', err.message));
    }
  }

  function flushQueue() {
    const sb = sourceBufferRef.current;
    if (!sb || sb.updating || chunkQueueRef.current.length === 0) return;
    const next = chunkQueueRef.current.shift();
    try { sb.appendBuffer(next); } catch (e) {
      console.warn('flushQueue appendBuffer error:', e.message);
    }
  }

  function onAudioFinished() {
    cleanupAudio();
    if (activeRef.current) {
      setStateSync('listening');
      if (!mutedRef.current) {
        ensureListening();
      }
    } else {
      setStateSync('idle');
    }
  }

  function cleanupAudio() {
    if (audioRef.current) {
      audioRef.current.pause();
      if (audioRef.current.src) {
        URL.revokeObjectURL(audioRef.current.src);
      }
      audioRef.current = null;
    }
    if (mediaSourceRef.current && mediaSourceRef.current.readyState === 'open') {
      try { mediaSourceRef.current.endOfStream(); } catch {}
    }
    mediaSourceRef.current = null;
    sourceBufferRef.current = null;
    chunkQueueRef.current = [];
    audioReadyRef.current = false;
    hasAudioRef.current = false;
  }

  function stopAudioPlayback() {
    cleanupAudio();
    turnDoneRef.current = false;
  }

  // ── Barge-in ──────────────────────────────────────────────────────────────────

  function bargeIn() {
    stopAudioPlayback();
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'interrupt' }));
    }
    fullTextRef.current = '';
    turnTextRef.current = '';
  }

  // ── Start a turn ──────────────────────────────────────────────────────────────

  function startTurn(text) {
    const currentRep = repRef.current;
    if (!currentRep) {
      setError('Rep data not loaded yet');
      return;
    }

    setStateSync('processing');
    setError('');
    fullTextRef.current = '';
    turnTextRef.current = '';

    // Initialize streaming audio for this turn
    initStreamingAudio();

    historyRef.current.push({ role: 'user', content: text });
    onUserMessageRef.current?.(text);

    const systemPrompt = buildSystemPrompt(currentRep);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'conversation_turn',
        systemPrompt,
        history: historyRef.current,
      }));
    } else {
      setError('Connection lost — reconnecting...');
      setStateSync('listening');
    }
  }

  // ── Turn management ───────────────────────────────────────────────────────────

  function handleTurnEnd() {
    const text = fullTextRef.current;
    historyRef.current.push({ role: 'assistant', content: text });
    onAssistantDoneRef.current?.(text);

    turnDoneRef.current = true;

    // If sourceBuffer is idle and queue is empty, end the stream now
    const sb = sourceBufferRef.current;
    const ms = mediaSourceRef.current;
    if (sb && !sb.updating && chunkQueueRef.current.length === 0 && ms?.readyState === 'open') {
      try { ms.endOfStream(); } catch {}
    }

    // If no audio was received, go back to listening immediately
    if (!hasAudioRef.current) {
      if (activeRef.current) {
        setStateSync('listening');
        ensureListening();
      } else {
        setStateSync('idle');
      }
    }
    // Otherwise, audio 'ended' event will trigger onAudioFinished
  }

  // ── WebSocket ─────────────────────────────────────────────────────────────────

  function connectWs() {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.onopen = () => {
      console.log('[Conv] WebSocket connected');
      reconnectRef.current = 0;
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      switch (msg.type) {
        case 'text':
          fullTextRef.current += msg.chunk;
          turnTextRef.current += msg.chunk;
          onAssistantChunkRef.current?.(turnTextRef.current);
          break;

        case 'text_done':
          fullTextRef.current = msg.fullText;
          break;

        case 'audio':
          if (stateRef.current !== 'idle') {
            appendAudioChunk(msg.data);
          }
          break;

        case 'turn_end':
          console.log(`[Conv] Turn end, hasAudio=${hasAudioRef.current}`);
          handleTurnEnd();
          break;

        case 'interrupted':
          break;

        case 'error':
          console.error('[Conv] Server error:', msg.message);
          setError(msg.message);
          break;
      }
    };

    ws.onclose = () => {
      console.log('[Conv] WebSocket closed');
      wsRef.current = null;
      if (activeRef.current) {
        const delay = Math.min(1000 * 2 ** reconnectRef.current, 10000);
        reconnectRef.current++;
        setTimeout(connectWs, delay);
      }
    };

    ws.onerror = () => {};
    wsRef.current = ws;
  }

  // ── Speech recognition (continuous) ───────────────────────────────────────────

  function ensureListening() {
    if (recognitionRef.current) return;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setError('Speech recognition requires Chrome');
      return;
    }

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const last = event.results[event.results.length - 1];
      if (last.isFinal) {
        const transcript = last[0].transcript.trim();
        if (!transcript) return;

        if (stateRef.current === 'speaking' || stateRef.current === 'processing') {
          bargeIn();
        }
        startTurn(transcript);
      }
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      if (activeRef.current) {
        setTimeout(ensureListening, 200);
      }
    };

    recognition.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      setError('Mic: ' + e.error);
    };

    recognition.start();
    recognitionRef.current = recognition;
  }

  function stopListening() {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────────

  const startConversation = useCallback(() => {
    activeRef.current = true;
    setError('');
    connectWs();
    setStateSync('listening');
    ensureListening();
  }, []);

  const stopConversation = useCallback(() => {
    activeRef.current = false;
    mutedRef.current = false;
    setMuted(false);
    stopListening();
    stopAudioPlayback();
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'interrupt' }));
    }
    setStateSync('idle');
  }, []);

  const muteMic = useCallback(() => {
    mutedRef.current = true;
    setMuted(true);
    stopListening();
  }, []);

  const unmuteMic = useCallback(() => {
    mutedRef.current = false;
    setMuted(false);
    if (activeRef.current && stateRef.current === 'listening') {
      ensureListening();
    }
  }, []);

  const sendText = useCallback((text) => {
    if (!text?.trim()) return;
    if (stateRef.current === 'speaking' || stateRef.current === 'processing') {
      bargeIn();
    }
    startTurn(text);
  }, []);

  useEffect(() => {
    return () => {
      activeRef.current = false;
      stopListening();
      stopAudioPlayback();
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    };
  }, []);

  return { state, error, muted, startConversation, stopConversation, sendText, muteMic, unmuteMic };
}
