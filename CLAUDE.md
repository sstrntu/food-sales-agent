# UST AI Sales Voice Agent — Gen 2 POC

## What This Is
A mobile-first voice-enabled AI sales assistant POC for USTrading. Each sales rep gets a personal assistant that knows their target, accounts, AR status, and promos — and guides them to hit their monthly number.

## Tech Stack
- React 18 + Vite (no TypeScript — plain JSX)
- Claude Sonnet API for AI responses (via direct browser fetch with `anthropic-dangerous-direct-browser-access` header)
- ElevenLabs TTS for voice output
- Web Speech Recognition API for voice input
- All data is mock/hardcoded — no backend or database

## Project Structure
```
src/
├── App.jsx                     # Main app, state management, message flow
├── main.jsx                    # React entry point
├── styles.css                  # All styles (no CSS modules or Tailwind)
├── data/
│   ├── reps.js                 # Mock data for 3 sales reps (Jimmy, Maria, Derek)
│   └── systemPrompt.js         # Builds Claude system prompt from rep data
├── services/
│   ├── claude.js               # Claude API call wrapper
│   └── elevenlabs.js           # ElevenLabs TTS wrapper
├── hooks/
│   └── useSpeechRecognition.js # Browser speech-to-text hook
└── components/
    ├── ChatView.jsx            # Chat conversation UI + quick prompts
    └── Dashboard.jsx           # Stats dashboard (target, AR, promos, accounts)
```

## Key Architecture Decisions
- **Single-page React app** — no routing, two views toggled via state (chat/dashboard)
- **API keys via env vars** — `VITE_ANTHROPIC_API_KEY`, `VITE_ELEVENLABS_API_KEY`, `VITE_ELEVENLABS_VOICE_ID`
- **System prompt contains ALL rep data** — the prompt is rebuilt per rep from `reps.js`, injecting targets, accounts, AR status, promos, trending items, etc.
- **Conversation history** maintained in a ref (`historyRef`) and sent with every Claude API call
- **No backend** — Claude API is called directly from browser (requires `anthropic-dangerous-direct-browser-access` header)
- **Mobile-first** — max-width 430px, dark theme, designed to simulate phone assistant UX

## Commands
```bash
npm run dev      # Start dev server on port 5173
npm run build    # Production build to dist/
npm run preview  # Preview production build
```

## Current Scenarios (Phase 1 MVP)
1. **Morning Check-In (1.1)** — "How am I doing this month?" → MTD vs target, pace, projection
2. **Gap to Target (1.2)** — "How far am I from my number?" → Gap in dollars, orders, visits
3. **Smart Recommendations (1.3)** — "What should I push?" → Top 3 items with reasons
4. **AR/Payment Alerts (2.1)** — "Any payment issues?" → Overdue, flagged, due-soon accounts
5. **Promo Alerts (3.2)** — "Any promos closing soon?" → Deadlines, untapped stores, dollar opportunity

## Phase 2 Scenarios (Not Yet Built)
- After-sell support (1.4) — post-order follow-up prompts
- Late payment collection scripts (2.2) — suggested conversation scripts
- Credit flag warnings (2.3) — block orders for flagged accounts
- Company push items (3.1) — weekly priority SKUs with talking points
- New item placement (3.3) — first-placement targets for new SKUs
- Proactive alerts — push-style notifications without being asked

## Mock Data Structure
Each rep in `src/data/reps.js` has: name, territory, monthly/weekly target, MTD sales, prior day/week performance, avg order size, business days remaining, plus arrays of accounts (with AR status, invoices, payment history), top sellers, trending items, back-in-stock items, and active promos.

## Agent Persona Rules (in system prompt)
- Brief — reps are driving/visiting stores, no preambles
- Specific — dollar amounts, visit counts, not vague advice
- Proactive — surface AR issues and promos without being asked
- Natural — conversational tone, no bullet points or markdown (output is spoken aloud)
- Actionable — always offer a next step ("Want me to list the stores?")

## Common Extension Patterns
- **Add a new scenario**: Update the SCENARIOS section in `src/data/systemPrompt.js` and add a quick prompt button in `src/components/ChatView.jsx`
- **Add a new rep**: Add an entry to the `REPS` object in `src/data/reps.js`
- **Change the AI model**: Update the model string in `src/services/claude.js`
- **Switch to OpenAI**: Replace `src/services/claude.js` with an OpenAI-compatible fetch call
- **Add real data**: Replace `src/data/reps.js` with API calls to your ERP/CRM
- **Change the voice**: Set `VITE_ELEVENLABS_VOICE_ID` in `.env` to a different voice ID from ElevenLabs
