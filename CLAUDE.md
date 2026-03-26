# UST AI Sales Voice Agent — Gen 2 POC

## What This Is
A mobile-first voice-enabled AI sales assistant POC for USTrading. Each sales rep gets a personal assistant that knows their target, accounts, AR status, and promos — and guides them to hit their monthly number.

## Tech Stack
- React 18 + Vite (no TypeScript — plain JSX)
- Express + WebSocket server (`server/index.js`) — proxies all API calls, handles streaming conversation
- Claude Sonnet (streaming SSE) via server-side proxy — keys never reach browser
- ElevenLabs WebSocket streaming TTS — real-time audio chunks piped to browser
- Web Speech API in continuous mode — auto-listen, barge-in
- MediaSource Extensions (MSE) — gapless streaming audio playback in browser
- Supabase — rep data storage (anon key safe for frontend)

## Project Structure
```
server/
└── index.js                    # Express REST (/api/chat, /api/speak) + WebSocket (/ws)
                                # Claude streaming SSE → sentence buffer → ElevenLabs WS → audio chunks

src/
├── App.jsx                     # Main app, state management, conversation orchestration
├── main.jsx                    # React entry point
├── styles.css                  # All styles (no CSS modules or Tailwind)
├── data/
│   ├── reps.js                 # Loads rep data from Supabase
│   ├── systemPrompt.js         # Builds Claude system prompt from rep data
│   └── weee.js                 # Weee hot items + UST catalog matches
├── services/
│   ├── claude.js               # Calls /api/chat (used for typed input fallback)
│   └── elevenlabs.js           # Calls /api/speak (used for typed input fallback)
├── hooks/
│   └── useConversation.js      # Core conversational hook — WebSocket, STT, MSE audio, barge-in, mute
└── components/
    ├── ChatView.jsx            # Chat UI + streaming text bubble + quick prompts + store picker
    └── Dashboard.jsx           # Stats dashboard (target, AR, promos, accounts)

docs/
└── tap-to-talk-archived.md    # Archived tap-to-talk implementation (one-shot STT mode)
```

## Key Architecture Decisions
- **Server handles all secrets** — Anthropic and ElevenLabs keys are server-side only; browser never sees them
- **WebSocket conversation protocol** — client sends `{type: conversation_turn, systemPrompt, history}`, server streams back `text` chunks, `audio` chunks (base64 MP3), and `turn_end`
- **[SPEECH] block protocol** — Claude outputs `[SPEECH]...[/SPEECH]` at start of every response; server routes that to ElevenLabs TTS only; display text (after `[/SPEECH]`) goes to chat UI
- **MSE streaming audio** — `MediaSource` + `SourceBuffer('audio/mpeg')` appends audio chunks as they arrive; playback starts on first chunk
- **Continuous STT** — Web Speech API with `continuous: true`; auto-restarts on `onend`; stopped while AI is speaking (echo prevention); resumed in `onAudioFinished`
- **Barge-in** — speaking while AI talks stops audio, sends `{type: interrupt}` to server, starts new turn
- **Mute** — stops STT without closing WebSocket or affecting audio; resumes STT on unmute
- **Stale closure prevention** — all props/callbacks stored in refs updated via `useEffect`; long-lived WS/STT handlers read from refs
- **System prompt contains ALL rep data** — rebuilt per rep from Supabase data, injecting targets, accounts, AR, promos, Weee items, category benchmarks
- **Mobile-first** — max-width 430px, dark theme, designed for phone use while driving

## Environment Variables
```bash
# Backend only (server/index.js — never sent to browser)
ANTHROPIC_API_KEY=...
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=...

# Frontend (safe — Supabase anon key is designed for browser use)
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Commands
```bash
npm run dev      # Vite dev server on :5173 (proxies /api and /ws to :3001)
npm run build    # Production build to dist/
npm run preview  # Preview production build

node server/index.js  # API + WebSocket server on :3001

docker compose up --build  # Full stack: nginx (app) + Express (api)
```

## Current Scenarios (Phase 1+)
1. **Morning Check-In (1.1)** — "How am I doing this month?" → MTD vs target, pace, projection
2. **Gap to Target (1.2)** — "How far am I from my number?" → Gap in dollars, orders, visits
3. **Smart Recommendations (1.3)** — "What should I push?" → Top 3 items with reasons
4. **Store Visit Briefing (1.4)** — Pre-meeting brief: AR, last order, promos, talking points
5. **AR/Payment Alerts (2.1)** — "Any payment issues?" → Overdue, flagged, due-soon accounts
6. **Promo Alerts (3.2)** — "Any promos closing soon?" → Deadlines, untapped stores, $ opportunity
7. **Weee Hot Items (7)** — "What's hot on Weee today?" → Top items with UST catalog matches
8. **Catalog Match (8)** — "Which Weee items do we carry?" → SKU, price, margin per item
9. **Category Trends (9)** — Store vs tier peer benchmarks, category gaps, growth opportunities

## Phase 2 Scenarios (Not Yet Built)
- After-sell support (1.4) — post-order follow-up prompts
- Late payment collection scripts (2.2) — suggested conversation scripts
- Credit flag warnings (2.3) — block orders for flagged accounts
- Company push items (3.1) — weekly priority SKUs with talking points
- New item placement (3.3) — first-placement targets for new SKUs
- Proactive alerts — push-style notifications without being asked

## Common Extension Patterns
- **Add a new scenario**: Update SCENARIOS in `src/data/systemPrompt.js`, add quick prompt in `src/components/ChatView.jsx`
- **Add a new rep**: Add to Supabase and update `src/data/reps.js` fetch
- **Change the AI model**: Update model string in `server/index.js` (two places: REST endpoint + WebSocket handler)
- **Change the voice**: Update `ELEVENLABS_VOICE_ID` in `.env`
- **Add real data**: Replace Supabase mock data with ERP/CRM API calls in `src/data/reps.js`

## Agent Persona Rules (in system prompt)
- Brief — reps are driving/visiting stores, no preambles
- Specific — dollar amounts, visit counts, not vague advice
- Proactive — surface AR issues and promos without being asked
- Natural — conversational, like talking to a trusted colleague
- Actionable — always offer a next step
- Voice-optimized — `[SPEECH]` block is written for spoken delivery, no abbreviations or markdown
