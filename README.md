# 🎙️ UST AI Sales Voice Agent — Gen 2 POC

Personal sales assistant that knows each rep's target, accounts, AR status, and guides them to hit their number every month. Voice-enabled with Claude AI and ElevenLabs TTS.

## Features

- **3 Sales Rep Profiles** — Switch between Jimmy (East Bay), Maria (South Bay), Derek (SF Peninsula)
- **5 Conversation Scenarios** — Morning check-in, gap-to-target, smart recommendations, AR alerts, promo alerts
- **Voice Input** — Browser Speech Recognition (Chrome)
- **Voice Output** — ElevenLabs TTS with natural conversational tone
- **AI Brain** — Claude Sonnet powers contextual responses with full rep data
- **Stats Dashboard** — Target progress, AR flags, active promos, account list
- **Mobile-First UI** — Designed to simulate the phone assistant experience

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up your API keys
cp .env.example .env
# Edit .env with your keys

# 3. Run the dev server
npm run dev
```

Open http://localhost:5173

## API Keys

| Key | Required | Where to get it |
|-----|----------|----------------|
| `VITE_ANTHROPIC_API_KEY` | Yes | [console.anthropic.com](https://console.anthropic.com) |
| `VITE_ELEVENLABS_API_KEY` | Optional | [elevenlabs.io](https://elevenlabs.io) |
| `VITE_ELEVENLABS_VOICE_ID` | Optional | Default: "Adam" voice |

The app works with text-only if ElevenLabs key is not set.

## Project Structure

```
src/
├── App.jsx                  # Main app component
├── main.jsx                 # React entry point
├── styles.css               # Global styles
├── data/
│   ├── reps.js              # Mock data for 3 sales reps
│   └── systemPrompt.js      # Claude system prompt builder
├── services/
│   ├── claude.js            # Claude API integration
│   └── elevenlabs.js        # ElevenLabs TTS integration
├── hooks/
│   └── useSpeechRecognition.js  # Browser speech input hook
└── components/
    ├── ChatView.jsx          # Chat conversation UI
    └── Dashboard.jsx         # Stats dashboard view
```

## Scenarios Covered (Phase 1 MVP)

| # | Scenario | Sample Trigger |
|---|----------|---------------|
| 1.1 | Morning Check-In | "How am I doing this month?" |
| 1.2 | Gap to Target | "How far am I from my number?" |
| 1.3 | Smart Recommendations | "What should I push this week?" |
| 2.1 | AR/Payment Alerts | "Any payment issues?" |
| 3.2 | Promo Alerts | "What promos are closing soon?" |

## Tech Stack

- **Frontend:** React 18 + Vite
- **AI:** Claude Sonnet via Anthropic API
- **Voice Out:** ElevenLabs TTS
- **Voice In:** Web Speech Recognition API
- **Data:** Mock JSON (no backend needed)

## Using with Claude Code

This project was designed to be extended with Claude Code:

```bash
# Open in Claude Code
claude

# Example prompts:
# "Add scenario 1.4 — after-sell support"
# "Add a late payment collection script scenario"
# "Switch to OpenAI instead of Claude"
# "Add real-time data from our ERP API"
# "Deploy to Vercel"
```

## Phase 2 Roadmap

- [ ] After-sell support (scenario 1.4)
- [ ] Late payment scripts & credit flags (2.2, 2.3)
- [ ] Company push items & new item placement (3.1, 3.3)
- [ ] Proactive push notification simulation
- [ ] Real ERP data integration
- [ ] Phone-based voice interface
