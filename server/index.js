const http = require('http');
const express = require('express');
const { WebSocketServer, WebSocket } = require('ws');

const app = express();
app.use(express.json({ limit: '2mb' }));

const ANTHROPIC_KEY   = process.env.ANTHROPIC_API_KEY;
const ELEVENLABS_KEY  = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE = process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB';

// ── Clean text for speech ───────────────────────────────────────────────────────

function cleanForSpeech(text) {
  let s = text;
  // Strip color markers: [+text+] [-text-] [~text~]
  s = s.replace(/\[\+/g, '');
  s = s.replace(/\+\]/g, '');
  s = s.replace(/\[\-/g, '');
  s = s.replace(/\-\]/g, '');
  s = s.replace(/\[~/g, '');
  s = s.replace(/~\]/g, '');
  // Strip bold/italic markers
  s = s.replace(/\*+/g, '');
  // Strip stray brackets
  s = s.replace(/[\[\]]/g, '');
  // Expand "k" shorthand: $79.2k → $79,200, $48k → $48,000
  s = s.replace(/\$(\d+)\.(\d+)k\b/gi, (_, whole, dec) => '$' + whole + ',' + dec.padEnd(3, '0').slice(0, 3));
  s = s.replace(/\$(\d+)k\b/gi, '$$$1,000');
  // Expand common abbreviations
  s = s.replace(/\bMTD\b/g, 'month to date');
  s = s.replace(/\bWTD\b/g, 'week to date');
  s = s.replace(/\bQTD\b/g, 'quarter to date');
  s = s.replace(/\bavg\b/gi, 'average');
  s = s.replace(/\bvs\.?\b/gi, 'versus');
  s = s.replace(/\bpct\b/gi, 'percent');
  s = s.replace(/(\d+)d\b/g, '$1 days');
  s = s.replace(/(\d+)w\b/g, '$1 weeks');
  s = s.replace(/\bAR\b/g, 'accounts receivable');
  s = s.replace(/\bSKU\b/gi, 'S K U');
  // Collapse whitespace
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

// ── Existing REST endpoints (kept for backward compat / non-conversation use) ──

app.post('/api/chat', async (req, res) => {
  const { systemPrompt, history } = req.body;
  if (!ANTHROPIC_KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured on server' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: history,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: err.error?.message || `Anthropic error ${response.status}` });
    }

    const data = await response.json();
    const text = data.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
    res.json({ text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/speak', async (req, res) => {
  const { text } = req.body;
  if (!ELEVENLABS_KEY) return res.status(500).json({ error: 'ELEVENLABS_API_KEY not configured on server' });

  const cleaned = cleanForSpeech(text);
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_KEY,
      },
      body: JSON.stringify({
        text: cleaned,
        model_id: 'eleven_turbo_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3 },
      }),
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `ElevenLabs error ${response.status}` });
    }

    const buffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(Buffer.from(buffer));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── HTTP + WebSocket server ─────────────────────────────────────────────────────

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// ── SSE parser for Anthropic streaming responses ────────────────────────────────

async function* parseAnthropicSSE(body) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop(); // keep incomplete line

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') return;

      try {
        const parsed = JSON.parse(data);
        if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
          yield parsed.delta.text;
        }
      } catch {}
    }
  }
}

// ── Sentence boundary detection ─────────────────────────────────────────────────

function extractSentences(buffer) {
  const sentences = [];
  // Split on sentence-ending punctuation followed by a space,
  // but NOT on decimal points (e.g. "66.9") or abbreviations
  const regex = /(?<!\d)([.!?]+)\s+/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(buffer)) !== null) {
    const sentence = buffer.slice(lastIndex, match.index + match[1].length).trim();
    if (sentence.length >= 3) {
      sentences.push(sentence);
    }
    lastIndex = regex.lastIndex;
  }

  return { sentences, remainder: buffer.slice(lastIndex) };
}

// ── WebSocket conversation handler ──────────────────────────────────────────────

wss.on('connection', (clientWs) => {
  console.log('[WS] Client connected');
  let claudeAbort = null;
  let elevenWs = null;
  let turnId = 0;
  let pendingTextQueue = [];
  let elevenReady = false;

  function cleanup() {
    if (claudeAbort) { claudeAbort.abort(); claudeAbort = null; }
    if (elevenWs && elevenWs.readyState === WebSocket.OPEN) {
      try { elevenWs.close(); } catch {}
    }
    elevenWs = null;
    pendingTextQueue = [];
    elevenReady = false;
  }

  function sendToClient(obj) {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify(obj));
    }
  }

  function sendTextToEleven(text) {
    const cleaned = cleanForSpeech(text);
    if (!cleaned) return;
    const msg = JSON.stringify({ text: cleaned + ' ' });
    if (elevenReady && elevenWs?.readyState === WebSocket.OPEN) {
      elevenWs.send(msg);
    } else {
      pendingTextQueue.push(msg);
    }
  }

  function flushPendingText() {
    while (pendingTextQueue.length > 0 && elevenWs?.readyState === WebSocket.OPEN) {
      elevenWs.send(pendingTextQueue.shift());
    }
    elevenReady = true;
  }

  async function handleTurn(systemPrompt, history, currentTurnId) {
    console.log(`[WS] Turn ${currentTurnId} starting, history length: ${history.length}`);
    claudeAbort = new AbortController();

    // 1. Start Claude streaming request
    let claudeRes;
    try {
      claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          stream: true,
          system: systemPrompt,
          messages: history,
        }),
        signal: claudeAbort.signal,
      });
    } catch (err) {
      if (err.name === 'AbortError') return;
      sendToClient({ type: 'error', message: err.message });
      sendToClient({ type: 'turn_end', turnId: currentTurnId });
      return;
    }

    if (!claudeRes.ok) {
      const errBody = await claudeRes.json().catch(() => ({}));
      sendToClient({ type: 'error', message: errBody.error?.message || `Anthropic error ${claudeRes.status}` });
      sendToClient({ type: 'turn_end', turnId: currentTurnId });
      return;
    }

    // 2. Open ElevenLabs WebSocket for streaming TTS
    elevenReady = false;
    pendingTextQueue = [];

    elevenWs = new WebSocket(
      `wss://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE}/stream-input?model_id=eleven_turbo_v2&output_format=mp3_44100_128`
    );

    elevenWs.on('open', () => {
      console.log(`[WS] ElevenLabs WS opened for turn ${currentTurnId}, voice=${ELEVENLABS_VOICE}, key=${ELEVENLABS_KEY ? 'set(' + ELEVENLABS_KEY.slice(0,8) + '...)' : 'MISSING'}`);
      // Send BOS (beginning of stream)
      const bos = {
        text: ' ',
        voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3 },
        xi_api_key: ELEVENLABS_KEY,
      };
      elevenWs.send(JSON.stringify(bos));
      flushPendingText();
    });

    let audioChunkCount = 0;
    elevenWs.on('message', (data) => {
      if (currentTurnId !== turnId) return;
      try {
        const msg = JSON.parse(data.toString());
        if (msg.audio) {
          audioChunkCount++;
          sendToClient({ type: 'audio', data: msg.audio });
        }
        if (msg.error) {
          console.error('[WS] ElevenLabs message error:', JSON.stringify(msg));
        }
        if (msg.message) {
          console.log('[WS] ElevenLabs message:', msg.message);
        }
      } catch {
        if (Buffer.isBuffer(data) && data.length > 0) {
          audioChunkCount++;
          sendToClient({ type: 'audio', data: data.toString('base64') });
        }
      }
    });

    elevenWs.on('error', (err) => {
      console.error('[WS] ElevenLabs WS error:', err.message);
    });

    let elevenClosed = false;
    const elevenClosePromise = new Promise(resolve => {
      elevenWs.on('close', (code, reason) => {
        console.log(`[WS] ElevenLabs WS closed (code=${code}, reason=${reason?.toString() || 'none'}), sent ${audioChunkCount} audio chunks`);
        elevenClosed = true;
        resolve();
      });
    });

    // 3. Parse Claude stream — extract [SPEECH]...[/SPEECH] for TTS, rest goes to display
    let ttsSentenceBuffer = '';   // sentence accumulator for ElevenLabs
    let fullText = '';            // display text (no SPEECH block)
    let speechBuf = '';           // buffer while waiting for [/SPEECH]
    let speechMode = true;        // true = still inside/waiting for SPEECH block

    const SPEECH_START = '[SPEECH]';
    const SPEECH_END = '[/SPEECH]';

    try {
      for await (const textDelta of parseAnthropicSSE(claudeRes.body)) {
        if (currentTurnId !== turnId) break;

        if (speechMode) {
          // Buffer until we find [/SPEECH]
          speechBuf += textDelta;
          const endIdx = speechBuf.indexOf(SPEECH_END);

          if (endIdx !== -1) {
            // Found the end of the SPEECH block — extract its content
            speechMode = false;
            const startIdx = speechBuf.indexOf(SPEECH_START);
            const speechContent = startIdx !== -1
              ? speechBuf.slice(startIdx + SPEECH_START.length, endIdx)
              : speechBuf.slice(0, endIdx);

            // Queue speech content for TTS (sentence by sentence)
            ttsSentenceBuffer += speechContent;
            const { sentences, remainder } = extractSentences(ttsSentenceBuffer);
            ttsSentenceBuffer = remainder;
            for (const s of sentences) sendTextToEleven(s);

            // Anything after [/SPEECH] on this chunk is display text
            const afterSpeech = speechBuf.slice(endIdx + SPEECH_END.length).replace(/^\n/, '');
            if (afterSpeech) {
              fullText += afterSpeech;
              sendToClient({ type: 'text', chunk: afterSpeech });
            }
            speechBuf = '';
          }
          // else: keep buffering — don't send anything to client or TTS yet
        } else {
          // Display mode — send to client, skip TTS
          fullText += textDelta;
          sendToClient({ type: 'text', chunk: textDelta });
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        sendToClient({ type: 'error', message: err.message });
      }
    }

    if (currentTurnId !== turnId) return;

    // Fallback: no [SPEECH] block found — treat buffered content as both display + TTS
    if (speechMode && speechBuf) {
      fullText += speechBuf;
      sendToClient({ type: 'text', chunk: speechBuf });
      ttsSentenceBuffer += speechBuf;
    }

    // 4. Flush remaining TTS sentence buffer
    if (ttsSentenceBuffer.trim()) {
      sendTextToEleven(ttsSentenceBuffer);
    }

    // 5. Send EOS to ElevenLabs
    if (elevenWs?.readyState === WebSocket.OPEN) {
      elevenWs.send(JSON.stringify({ text: '' }));
    }

    // 6. Send full text to client
    sendToClient({ type: 'text_done', fullText });

    // 7. Wait for ElevenLabs to finish sending audio, then signal turn end
    if (!elevenClosed) {
      await elevenClosePromise;
    }

    if (currentTurnId === turnId) {
      sendToClient({ type: 'turn_end', turnId: currentTurnId });
    }

    claudeAbort = null;
    elevenWs = null;
  }

  clientWs.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    if (msg.type === 'conversation_turn') {
      turnId++;
      cleanup();
      handleTurn(msg.systemPrompt, msg.history, turnId);
    }

    if (msg.type === 'interrupt') {
      turnId++;
      cleanup();
      sendToClient({ type: 'interrupted' });
    }
  });

  clientWs.on('close', () => { cleanup(); });
  clientWs.on('error', () => { cleanup(); });
});

server.listen(3001, () => console.log('API server listening on :3001 (HTTP + WS)'));
