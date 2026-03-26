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
  const useFallbackAudioRef = useRef(false); // true when MSE not supported (mobile Safari)
  const fallbackChunksRef = useRef([]); // collected base64 chunks for fallback playback

  function setStateSync(s) {
    stateRef.current = s;
    setState(s);
  }

  // ── Unlock audio on mobile (must be called from user gesture) ─────────────────

  const unlockedAudioRef = useRef(null);

  function unlockAudio() {
    if (unlockedAudioRef.current) return;
    try {
      const audio = new Audio();
      // Store ref immediately (synchronously within user gesture) so it's available for later reuse
      unlockedAudioRef.current = audio;
      audio.src = 'data:audio/mp3;base64,/+NIxAAAAAANIAAAAAExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
      audio.volume = 0;
      audio.play().then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.src = '';
        console.log('[Conv] Audio unlocked on mobile');
      }).catch(e => {
        console.warn('[Conv] Audio unlock failed:', e.message);
      });
      // Also unlock AudioContext (helps on some Android browsers)
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) {
          const ctx = new AC();
          const buf = ctx.createBuffer(1, 1, 22050);
          const src = ctx.createBufferSource();
          src.buffer = buf;
          src.connect(ctx.destination);
          src.start();
          if (ctx.state === 'suspended') ctx.resume();
        }
      } catch {}
    } catch (e) {
      console.warn('[Conv] Could not unlock audio:', e.message);
    }
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

    turnDoneRef.current = false;
    hasAudioRef.current = false;
    chunkQueueRef.current = [];
    fallbackChunksRef.current = [];

    // Check if MSE is supported (mobile Safari doesn't support it)
    const mseSupported = typeof MediaSource !== 'undefined' &&
      MediaSource.isTypeSupported && MediaSource.isTypeSupported('audio/mpeg');

    // Detect mobile — prefer fallback on mobile even if MSE reports support,
    // because MSE + autoplay is unreliable on mobile browsers
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (!mseSupported || isMobile) {
      console.log(`[Conv] Using fallback audio (MSE=${mseSupported}, mobile=${isMobile})`);
      useFallbackAudioRef.current = true;
      audioReadyRef.current = true;
      return;
    }

    useFallbackAudioRef.current = false;

    const mediaSource = new MediaSource();
    const audio = new Audio();
    audio.src = URL.createObjectURL(mediaSource);

    mediaSourceRef.current = mediaSource;
    audioRef.current = audio;
    sourceBufferRef.current = null;
    audioReadyRef.current = false;

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
        useFallbackAudioRef.current = true;
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

    // Fallback mode: collect chunks, play after turn ends
    if (useFallbackAudioRef.current) {
      fallbackChunksRef.current.push(base64Data);
      if (fallbackChunksRef.current.length === 1) {
        setStateSync('speaking');
        stopListening();
      }
      return;
    }

    // MSE mode: stream audio in real time
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
      // Don't revoke/destroy the unlocked audio element — we reuse it
      if (audioRef.current !== unlockedAudioRef.current && audioRef.current.src) {
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
    fallbackChunksRef.current = [];
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

  function startTurn(text, { voice = false } = {}) {
    const currentRep = repRef.current;
    if (!currentRep) {
      setError('Rep data not loaded yet');
      return;
    }

    setStateSync('processing');
    setError('');
    fullTextRef.current = '';
    turnTextRef.current = '';

    // Only initialize audio when voice mode is active
    if (voice) {
      initStreamingAudio();
    }

    historyRef.current.push({ role: 'user', content: text });
    onUserMessageRef.current?.(text);

    const systemPrompt = buildSystemPrompt(currentRep);

    function sendMessage() {
      wsRef.current.send(JSON.stringify({
        type: 'conversation_turn',
        systemPrompt,
        history: historyRef.current,
        voice,
      }));
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      sendMessage();
    } else {
      // Auto-connect and send once open
      connectWs();
      const checkReady = setInterval(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          clearInterval(checkReady);
          sendMessage();
        }
      }, 100);
      // Timeout after 5s
      setTimeout(() => {
        clearInterval(checkReady);
        if (wsRef.current?.readyState !== WebSocket.OPEN) {
          setError('Could not connect — please try again');
          setStateSync('idle');
        }
      }, 5000);
    }
  }

  // ── Turn management ───────────────────────────────────────────────────────────

  function handleTurnEnd() {
    const text = fullTextRef.current;
    historyRef.current.push({ role: 'assistant', content: text });
    onAssistantDoneRef.current?.(text);

    turnDoneRef.current = true;

    // Fallback mode: decode each base64 chunk separately, combine binary, play
    if (useFallbackAudioRef.current && fallbackChunksRef.current.length > 0) {
      // Decode each chunk individually (can't just concatenate base64 strings)
      const decoded = fallbackChunksRef.current.map(b64 => {
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return bytes;
      });
      const totalLen = decoded.reduce((sum, b) => sum + b.length, 0);
      const combined = new Uint8Array(totalLen);
      let offset = 0;
      for (const buf of decoded) {
        combined.set(buf, offset);
        offset += buf.length;
      }
      fallbackChunksRef.current = [];
      console.log(`[Conv] Fallback audio: ${decoded.length} chunks, ${totalLen} bytes`);

      const blob = new Blob([combined], { type: 'audio/mpeg' });
      const blobUrl = URL.createObjectURL(blob);

      // Reuse the unlocked audio element if available (mobile), else create new
      const audio = unlockedAudioRef.current || new Audio();
      audio.volume = 1.0;
      audioRef.current = audio;

      const onEnded = () => {
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('error', onError);
        URL.revokeObjectURL(blobUrl);
        onAudioFinished();
      };
      const onError = () => {
        console.warn('[Conv] Fallback audio error');
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('error', onError);
        URL.revokeObjectURL(blobUrl);
        onAudioFinished();
      };
      audio.addEventListener('ended', onEnded);
      audio.addEventListener('error', onError);
      audio.src = blobUrl;
      audio.play().then(() => {
        console.log('[Conv] Fallback audio playing');
      }).catch(err => {
        console.warn('[Conv] Fallback audio play failed on unlocked element:', err.message);
        // Retry with a fresh Audio element (some browsers allow it after page interaction)
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('error', onError);
        const retryAudio = new Audio(blobUrl);
        retryAudio.volume = 1.0;
        audioRef.current = retryAudio;
        retryAudio.addEventListener('ended', () => {
          URL.revokeObjectURL(blobUrl);
          onAudioFinished();
        });
        retryAudio.addEventListener('error', () => {
          console.warn('[Conv] Fallback audio retry also failed');
          URL.revokeObjectURL(blobUrl);
          onAudioFinished();
        });
        retryAudio.play().catch(err2 => {
          console.warn('[Conv] Fallback audio retry play failed:', err2.message);
          URL.revokeObjectURL(blobUrl);
          onAudioFinished();
        });
      });
      return;
    }

    // MSE mode: finalize the stream
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

    ws.onerror = (err) => {
      console.error('[Conv] WebSocket error:', err);
    };
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
        startTurn(transcript, { voice: true });
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
    unlockAudio(); // unlock audio playback on mobile (must be in user gesture)
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
    // Only use voice when conversation mode is active (mic on)
    startTurn(text, { voice: activeRef.current });
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
