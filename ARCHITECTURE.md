# UST AI Sales Voice Agent — Architecture & Design

## Overview

A mobile-first voice-enabled AI sales assistant for USTrading. Each sales rep gets a personal AI assistant that knows their targets, accounts, AR status, and promos — and guides them to hit their monthly number.

**Stack:** React 18 + Vite | Express + WebSocket | Claude Sonnet 4 (streaming) | ElevenLabs WS TTS | Web Speech API | MediaSource Extensions | Supabase

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Client (Browser)                       │
│                                                              │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  React UI  │  │ Web Speech   │  │  MediaSource (MSE)   │  │
│  │  (Vite)    │  │ API (STT)    │  │  SourceBuffer audio  │  │
│  └─────┬──────┘  └──────┬───────┘  └──────────┬───────────┘  │
│        │                │                     ▲              │
│        └────────────────▼─────────────────────┘              │
│                  ┌───────────────────┐                        │
│                  │ useConversation.js│                        │
│                  │ - WebSocket client│                        │
│                  │ - STT continuous  │                        │
│                  │ - MSE audio       │                        │
│                  │ - Barge-in / Mute │                        │
│                  └────────┬──────────┘                        │
└───────────────────────────┼───────────────────────────────────┘
                            │ WebSocket /ws
                            │ (text chunks, audio chunks, turn_end)
┌───────────────────────────▼───────────────────────────────────┐
│                    server/index.js                             │
│                    (Express + ws)                              │
│                                                               │
│  WebSocket handler per client:                                │
│  ┌──────────────────────────────────────────────────────┐     │
│  │  conversation_turn msg received                       │     │
│  │      │                                               │     │
│  │      ▼                                               │     │
│  │  Claude Streaming SSE ────→ extractSentences()       │     │
│  │      │                          │                    │     │
│  │      │ text chunks              ▼                    │     │
│  │      ▼                  ElevenLabs WS TTS            │     │
│  │  [SPEECH] block ───────→ (stream-input)              │     │
│  │  (TTS only)                    │                     │     │
│  │                                ▼ audio chunks        │     │
│  │  display text ─────────────────────────────────────→ client│
│  │  (chat UI)         {type:'audio', data: base64}      │     │
│  └──────────────────────────────────────────────────────┘     │
│                                                               │
│  REST endpoints (typed input / legacy):                       │
│  POST /api/chat  → Claude (non-streaming)                     │
│  POST /api/speak → ElevenLabs (REST TTS)                      │
└───────────────────────────────────────────────────────────────┘
          │                              │
          ▼                              ▼
   ┌──────────────┐              ┌──────────────┐
   │ Anthropic API│              │ ElevenLabs   │
   │ (SSE stream) │              │ (WS TTS)     │
   └──────────────┘              └──────────────┘
```

---

## Conversational Voice Flow

### Full Turn (voice input)
```
User speaks
  → Web Speech API fires onresult (final transcript)
  → if AI was speaking: bargeIn() — stop audio, send {type: interrupt} to server
  → startTurn(transcript)
      → push to historyRef
      → initStreamingAudio() — new MediaSource + SourceBuffer
      → send {type: conversation_turn, systemPrompt, history} over WebSocket

Server receives conversation_turn:
  → Fetch Claude SSE stream
  → Buffer incoming text until [/SPEECH] found
      → Text inside [SPEECH]...[/SPEECH] → sentence-buffer → ElevenLabs WS TTS
      → ElevenLabs sends back base64 audio chunks → {type: audio} to client
  → Text after [/SPEECH] → {type: text, chunk} to client (chat UI)
  → Claude stream ends → flush sentence buffer → send EOS to ElevenLabs
  → Wait for ElevenLabs WS to close → send {type: turn_end}

Client receives audio chunks:
  → appendBuffer to SourceBuffer
  → audio.play() on first chunk
  → stopListening() to prevent echo feedback
  → state = 'speaking'

Client receives turn_end:
  → fullText added to historyRef + messages
  → turnDoneRef = true → mediaSource.endOfStream() when buffer drains
  → audio 'ended' → state = 'listening', ensureListening()
```

### Barge-In
```
User speaks while AI is playing audio
  → STT fires (mic was NOT stopped — barge-in detected)
  → stopAudioPlayback() — pause audio, revoke ObjectURL
  → send {type: interrupt} to server
  → server aborts Claude fetch, closes ElevenLabs WS
  → startTurn(newTranscript)
```

### Typed Input
```
User types + Enter → conversation.sendText(text)
  → same startTurn() path — goes over WebSocket
  → voice responds the same way
```

---

## [SPEECH] Block Protocol

Claude is instructed to start every response with:
```
[SPEECH]
Natural spoken summary — 2-4 sentences, no abbreviations,
no markdown, written exactly how you'd say it out loud.
[/SPEECH]

Full formatted text response with bullets, bold, color tags...
```

Server routing:
- Text inside `[SPEECH]...[/SPEECH]` → piped to ElevenLabs (TTS only, never displayed)
- Text after `[/SPEECH]` → sent as `{type: text}` chunks to client (chat UI, not TTS)
- `fullText` in `text_done` = display text only (stored in history)

This gives you a conversational voice summary without reading markdown verbatim.

---

## Component Tree

```
App.jsx
├── Top Bar
│   ├── Rep Selector (avatar + name + territory)
│   ├── New Chat button
│   └── Rep Dropdown
├── View Toggle (Chat / Dashboard)
├── Stats Strip (MTD, Target, Gap, Days Left)
├── Progress Bar
├── Main Area
│   ├── ChatView.jsx
│   │   ├── Empty State (greeting + quick prompt grid)
│   │   ├── Message List (user + AI bubbles + streaming bubble)
│   │   ├── Thinking Indicator
│   │   ├── Error Banner
│   │   └── Store Picker Modal
│   └── Dashboard.jsx
│       ├── Sales Target Card
│       ├── Accounts Receivable Card
│       ├── Active Promos Card
│       └── Accounts List Card
└── Bottom Input
    ├── Quick Prompt Chips (horizontal scroll)
    ├── Store Picker Sheet
    ├── Input Row
    │   ├── Text Input
    │   ├── Mute Button (when conv active)
    │   └── Send Button / Mic Button (conv toggle)
    └── Status Hint
```

---

## File Structure

```
server/
├── index.js                    # Express + WebSocket server
└── package.json                # ws, express dependencies

src/
├── App.jsx                     # Root: state, conversation orchestration
├── main.jsx                    # React entry point
├── styles.css                  # All styles (CSS variables, dark theme)
├── data/
│   ├── reps.js                 # Loads rep data from Supabase
│   ├── systemPrompt.js         # Dynamic system prompt builder
│   └── weee.js                 # Weee hot items + UST catalog matches
├── services/
│   ├── claude.js               # Calls /api/chat (typed input path)
│   └── elevenlabs.js           # Calls /api/speak (typed input path)
├── hooks/
│   └── useConversation.js      # WebSocket + STT + MSE audio + barge-in + mute
└── components/
    ├── ChatView.jsx            # Chat UI + streaming text bubble + quick prompts
    └── Dashboard.jsx           # Stats dashboard

docs/
└── tap-to-talk-archived.md    # Archived tap-to-talk (one-shot STT) implementation
```

---

## State Management

All state lives in `App.jsx`. `useConversation` hook manages its own internal state via refs.

### App.jsx State

| State | Type | Purpose |
|-------|------|---------|
| `repId` | string | Active rep ID |
| `repsData` | object | All rep data loaded from Supabase |
| `messages` | array | Display messages `[{ role, text }]` |
| `input` | string | Text input value |
| `streamingText` | string\|null | Current in-progress assistant response |
| `convActive` | boolean | Conversation mode on/off |
| `view` | string | "chat" or "dashboard" |
| `showReps` | boolean | Rep dropdown visible |
| `showStorePicker` | boolean | Store picker modal visible |
| `tick` | number | Pulse animation counter |

### useConversation Internal State (refs)

| Ref | Purpose |
|-----|---------|
| `wsRef` | WebSocket connection |
| `recognitionRef` | SpeechRecognition instance |
| `activeRef` | Conversation is active |
| `mutedRef` | Mic is muted |
| `audioRef` | HTML Audio element |
| `mediaSourceRef` | MediaSource for MSE |
| `sourceBufferRef` | SourceBuffer for audio chunks |
| `chunkQueueRef` | Queued chunks waiting for SourceBuffer |
| `historyRef` | (passed in from App) Full Claude conversation history |
| `fullTextRef` | Accumulates current turn text |
| `stateRef` | Mirrors `state` for use in callbacks |
| `repRef` | Mirrors `rep` prop (stale closure prevention) |

---

## Server WebSocket Protocol

### Client → Server

| Message | Payload | Description |
|---------|---------|-------------|
| `conversation_turn` | `{ systemPrompt, history }` | Start a new AI turn |
| `interrupt` | — | Stop current turn immediately |

### Server → Client

| Message | Payload | Description |
|---------|---------|-------------|
| `text` | `{ chunk }` | Streaming display text chunk |
| `text_done` | `{ fullText }` | Complete display text (for history) |
| `audio` | `{ data }` | Base64 MP3 audio chunk from ElevenLabs |
| `turn_end` | `{ turnId }` | Turn complete, all audio sent |
| `interrupted` | — | Acknowledge interrupt |
| `error` | `{ message }` | Server-side error |

---

## AI Integration

### System Prompt Architecture

```
PERSONALITY & TONE
REP PROFILE         → Name, territory, targets, daily run rate, projections
ACCOUNTS            → All accounts with tier, avg order, AR status, payment history
TOP SELLERS         → High-velocity products
TRENDING            → Growing items with growth % and notes
BACK IN STOCK       → Items with waiting stores
PROMOS              → Active promotions with deadlines and $ opportunity
OVERDUE / FLAGGED / DUE SOON → Filtered AR lists
WEEE HOT ITEMS      → Today's top-selling items on Weee + UST catalog matches
CATEGORY BENCHMARKS → Tier-level spend averages by category
SCENARIOS (9)       → Handlers for each conversation type
CONVERSATIONAL FOLLOW-UPS → Proactive offers after each scenario
VOICE OUTPUT FORMAT → [SPEECH] block instructions
```

### Claude API
- **Model:** `claude-sonnet-4-20250514`
- **Max tokens:** 1024
- **Streaming:** `stream: true` via SSE (WebSocket path) or non-streaming (REST path)
- Full conversation history sent with each request

### ElevenLabs TTS
- **Endpoint:** `wss://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream-input`
- **Model:** `eleven_turbo_v2`
- **Format:** `mp3_44100_128`
- **Protocol:** BOS (begin-of-stream with voice settings) → text chunks → EOS `{text: ''}`
- One WebSocket connection opened per turn, closed after all audio sent

---

## cleanForSpeech (server-side)

Applied to all text sent to ElevenLabs before TTS:

1. Strip color markers: `[+`, `+]`, `[-`, `-]`, `[~`, `~]`
2. Strip bold markers: `**`, `*`
3. Strip stray brackets: `[`, `]`
4. Expand `$` shorthand: `$48k → $48,000`, `$79.2k → $79,200`
5. Expand abbreviations: `MTD → month to date`, `avg → average`, `AR → accounts receivable`, `18d → 18 days`, `vs → versus`, etc.
6. Collapse whitespace

---

## Quick Prompts / Scenarios

| Label | Trigger Text | Notes |
|-------|-------------|-------|
| Check-in | "How am I doing this month?" | MTD, pace, projection |
| My Gap | "How far am I from my number?" | Dollar gap, orders needed |
| What to Push | "What should I push this week?" | Top 3 with reasons |
| Store Visit | (store picker) | Pre-meeting brief |
| AR Issues | "Any payment issues?" | Overdue, flagged, due-soon |
| Promos | "Any promos closing soon?" | Deadlines, $ opportunity |
| Hot Items | "What's hot on Weee today?" | Top Weee items + UST matches |
| Cat Trends | (store picker) | Tier benchmark comparison |

---

## Deployment

### Docker (Production)

```
docker-compose.yml
├── app (nginx:alpine)
│   ├── Builds React app (node:20-alpine → npm ci → npm run build)
│   ├── Serves dist/ as static files on :80
│   └── nginx.conf
│       ├── SPA routing (try_files fallback)
│       ├── /api → proxy to api:3001
│       └── /ws  → WebSocket proxy to api:3001 (Upgrade headers)
└── api (node:20-alpine)
    ├── Runs server/index.js
    └── Exposes :3001 (HTTP + WebSocket)

External: port 3005 → app:80
```

### nginx WebSocket Proxy
```nginx
location /ws {
    proxy_pass http://api:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 300s;
}
```

### Vite Dev Proxy
```js
// vite.config.js
proxy: {
  '/api': 'http://localhost:3001',
  '/ws': { target: 'ws://localhost:3001', ws: true },
}
```

### Environment Variables

```bash
# Server-side (server/index.js reads from process.env)
ANTHROPIC_API_KEY=...
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=...

# Frontend (baked into Vite build — safe, anon key only)
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

---

## Design System

### Aesthetic: Light mode with dark accents

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-deep` | `#f0f2f5` | Page background |
| `--bg-base` | `#ffffff` | Base surface |
| `--bg-raised` | `#f8f9fb` | Elevated cards |
| `--accent` | `#6366f1` | Primary accent (indigo) |
| `--green` | `#10b981` | Positive/listening state |
| `--yellow` | `#f59e0b` | Warning/thinking state |
| `--red` | `#ef4444` | Danger/muted state |

### Typography
- **Display/Headings:** Plus Jakarta Sans
- **Body:** Figtree

### Voice Button States

| State | Color | Animation |
|-------|-------|-----------|
| Inactive | Dark gradient | None |
| Listening | Green gradient | Pulse glow |
| Thinking | Amber gradient | Dot pulse |
| Speaking | Indigo gradient | Waveform bars |
| Muted (conv active) | Grey gradient | None |

### Mute Button States

| State | Color |
|-------|-------|
| Unmuted | Transparent, black icon |
| Muted | Red icon |
