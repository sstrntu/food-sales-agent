# UST AI Sales Voice Agent — Gen 2 POC

Personal AI sales assistant for USTrading reps. Knows each rep's target, accounts, AR status, and promos — and guides them to hit their monthly number. Fully voice-enabled with streaming conversation, barge-in, and real-time TTS.

## Features

- **Conversational Voice Mode** — Continuous STT + streaming Claude responses + ElevenLabs TTS. Speak, barge in, mute — full hands-free loop
- **Streaming Audio** — MediaSource Extensions for gapless real-time speech playback as Claude responds
- **Smart Speech Output** — Claude generates a conversational spoken summary (`[SPEECH]` block) separate from the full formatted text displayed in chat
- **3 Sales Rep Profiles** — Jimmy (East Bay), Maria (South Bay), Derek (SF Peninsula)
- **9 Conversation Scenarios** — Check-in, gap-to-target, recommendations, store visit briefing, AR alerts, promo alerts, Weee hot items, catalog matching, category trends
- **Weee Integration** — Live hot items from Weee marketplace matched against UST catalog
- **Stats Dashboard** — Target progress, AR flags, active promos, account list
- **Mobile-First UI** — Max 430px, dark theme, designed for use while driving

## Quick Start

```bash
# 1. Install frontend dependencies
npm install

# 2. Install server dependencies
cd server && npm install && cd ..

# 3. Set up environment variables
cp .env.example .env
# Edit .env — see API Keys section below

# 4. Run both frontend + server in dev mode
npm run dev          # Vite on :5173 (proxies /api and /ws to :3001)
node server/index.js # Express + WebSocket on :3001
```

Or run everything with Docker:

```bash
docker compose up --build
# App on :3005
```

## API Keys

All secret keys live **server-side only** — never in the browser bundle.

| Variable | Required | Where |
|----------|----------|-------|
| `ANTHROPIC_API_KEY` | Yes | Server only — [console.anthropic.com](https://console.anthropic.com) |
| `ELEVENLABS_API_KEY` | Yes | Server only — [elevenlabs.io](https://elevenlabs.io) |
| `ELEVENLABS_VOICE_ID` | Yes | Server only — voice ID from your ElevenLabs account |
| `VITE_SUPABASE_URL` | Yes | Frontend — your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Frontend — your Supabase anon key (safe to expose) |

## Project Structure

```
server/
└── index.js                # Express REST + WebSocket server
                            # Handles Claude streaming, ElevenLabs WS TTS

src/
├── App.jsx                 # Root: state, conversation orchestration
├── main.jsx                # React entry point
├── styles.css              # All styles (no CSS modules or Tailwind)
├── data/
│   ├── reps.js             # Loads rep data from Supabase
│   ├── systemPrompt.js     # Builds Claude system prompt from rep data
│   └── weee.js             # Weee hot items + UST catalog matches
├── services/
│   ├── claude.js           # REST /api/chat wrapper (legacy/typed path)
│   └── elevenlabs.js       # REST /api/speak wrapper (legacy/typed path)
├── hooks/
│   └── useConversation.js  # Core conversational voice hook (WebSocket + STT + MSE audio)
└── components/
    ├── ChatView.jsx         # Chat UI, quick prompts, streaming bubble, store picker
    └── Dashboard.jsx        # Stats dashboard view

docs/
└── tap-to-talk-archived.md # Archived one-shot voice implementation (reference only)
```

## Scenarios

| # | Label | Sample Trigger |
|---|-------|---------------|
| 1 | Check-In | "How am I doing this month?" |
| 2 | My Gap | "How far am I from my number?" |
| 3 | What to Push | "What should I push this week?" |
| 4 | Store Visit | (store picker → pre-meeting brief) |
| 5 | AR Issues | "Any payment issues?" |
| 6 | Promos | "Any promos closing soon?" |
| 7 | Hot Items | "What's hot on Weee today?" |
| 8 | Catalog Match | "Which Weee items do we carry?" |
| 9 | Category Trends | (store picker → tier benchmark comparison) |

## Voice Architecture

```
User speaks → Web Speech API (continuous STT)
    → useConversation sends {type: conversation_turn} over WebSocket
    → Server streams Claude response (SSE)
    → [SPEECH] block → ElevenLabs WebSocket TTS → base64 audio chunks
    → Client MSE SourceBuffer → gapless streaming playback
    → Display text (post-[SPEECH]) → chat UI streaming bubble
    → Audio ends → STT resumes automatically
```

User can barge in at any time — speaking while AI is talking sends an interrupt and starts a new turn.

## Phase 2 Roadmap

- [ ] After-sell support (1.4) — post-order follow-up prompts
- [ ] Late payment scripts & credit flags (2.2, 2.3)
- [ ] Company push items & new item placement (3.1, 3.3)
- [ ] Proactive push alerts
- [ ] Real ERP/CRM data integration
- [ ] Authentication — rep login
