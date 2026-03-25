const express = require('express');
const app = express();
app.use(express.json({ limit: '2mb' }));

const ANTHROPIC_KEY   = process.env.ANTHROPIC_API_KEY;
const ELEVENLABS_KEY  = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE = process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB';

// ── POST /api/chat — proxies to Anthropic Claude ──────────────────────────────
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

// ── POST /api/speak — proxies to ElevenLabs TTS ───────────────────────────────
app.post('/api/speak', async (req, res) => {
  const { text } = req.body;
  if (!ELEVENLABS_KEY) return res.status(500).json({ error: 'ELEVENLABS_API_KEY not configured on server' });

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_KEY,
      },
      body: JSON.stringify({
        text,
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

app.listen(3001, () => console.log('API server listening on :3001'));
