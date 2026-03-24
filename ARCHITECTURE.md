# UST AI Sales Voice Agent — Architecture & Design

## Overview

A mobile-first voice-enabled AI sales assistant for USTrading. Each sales rep gets a personal AI assistant that knows their targets, accounts, AR status, and promos — and guides them to hit their monthly number.

**Stack:** React 18 + Vite | Claude Sonnet 4 | ElevenLabs TTS | Web Speech API

---

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Client (Browser)                  │
│                                                     │
│  ┌───────────┐  ┌────────────┐  ┌───────────────┐  │
│  │  React UI │  │ Speech API │  │  Audio Player │  │
│  │  (Vite)   │  │  (STT)     │  │  (TTS output) │  │
│  └─────┬─────┘  └─────┬──────┘  └───────┬───────┘  │
│        │               │                 │          │
│        ▼               ▼                 ▲          │
│  ┌─────────────────────────────────────────────┐    │
│  │              App.jsx (Orchestrator)          │    │
│  │  - State management                         │    │
│  │  - Message flow                             │    │
│  │  - Voice mode detection (mic → TTS auto)    │    │
│  └──────┬──────────────────────────┬───────────┘    │
│         │                          │                │
│         ▼                          ▼                │
│  ┌──────────────┐          ┌──────────────┐         │
│  │  claude.js   │          │ elevenlabs.js│         │
│  │  (AI Service)│          │ (TTS Service)│         │
│  └──────┬───────┘          └──────┬───────┘         │
└─────────┼─────────────────────────┼─────────────────┘
          │                         │
          ▼                         ▼
   ┌──────────────┐         ┌──────────────┐
   │ Anthropic API│         │ ElevenLabs   │
   │ (Claude)     │         │ API (TTS)    │
   └──────────────┘         └──────────────┘
```

---

## Component Tree

```
App.jsx
├── Top Bar
│   ├── Rep Selector (avatar + name + territory)
│   ├── New Chat button (visible when messages exist)
│   └── Rep Dropdown (overlay + account list)
├── View Toggle (Chat / Dashboard)
├── Stats Strip (MTD, Target, Gap, Days Left)
├── Progress Bar
├── Main Area
│   ├── ChatView.jsx
│   │   ├── Empty State (greeting + quick prompt grid)
│   │   ├── Message List (user bubbles + AI bubbles)
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
    ├── Text Input
    ├── Send Button / Mic Button
    └── Status Hint
```

---

## Data Flow

### Voice Input Flow
```
User speaks → Web Speech API (STT) → transcript text
    → usedMicRef.current = true
    → handleSend(text)
    → Add to UI + historyRef
    → callClaude(rep, history) with system prompt
    → AI response returned
    → Add to UI
    → speak(response) via ElevenLabs (because mic was used)
    → Audio plays back to user
```

### Text Input Flow
```
User types + Enter → handleSend(text)
    → Same as above but usedMicRef stays false
    → TTS does NOT play — text response only
```

### Rep Switch Flow
```
User selects new rep → setRepId(newId)
    → useEffect clears messages, historyRef, errors
    → System prompt auto-rebuilds from new rep data on next message
```

---

## File Structure

```
src/
├── App.jsx                     # Root: state, routing, message orchestration
├── main.jsx                    # React entry point
├── styles.css                  # All styles (CSS variables, dark theme)
├── data/
│   ├── reps.js                 # Mock data for 3 sales reps
│   └── systemPrompt.js         # Dynamic system prompt builder
├── services/
│   ├── claude.js               # Claude Sonnet 4 API wrapper
│   └── elevenlabs.js           # ElevenLabs TTS wrapper
├── hooks/
│   └── useSpeechRecognition.js # Browser speech-to-text hook
└── components/
    ├── ChatView.jsx            # Chat UI + quick prompts + store picker
    └── Dashboard.jsx           # Stats dashboard
```

---

## State Management

All state lives in `App.jsx` — no external state library.

| State | Type | Purpose |
|-------|------|---------|
| `repId` | string | Active rep ID ("jimmy", "maria", "derek") |
| `messages` | array | Display messages `[{ role, text }]` |
| `speaking_` | boolean | ElevenLabs TTS currently playing |
| `thinking` | boolean | Claude API call in progress |
| `input` | string | Text input field value |
| `showReps` | boolean | Rep dropdown visible |
| `view` | string | "chat" or "dashboard" |
| `error` | string | Error message to display |
| `tick` | number | Pulse animation counter |
| `showStorePicker` | boolean | Store picker modal visible |
| `historyRef` | ref (array) | Full conversation history for Claude API |
| `usedMicRef` | ref (boolean) | Whether current input came from mic |

---

## AI Integration

### System Prompt Architecture

The system prompt is rebuilt per rep from `reps.js` data on every API call:

```
PERSONALITY & TONE
    → Brief, specific, proactive, natural
    → Use line breaks, bold, bullets for structure

REP PROFILE
    → Name, territory, targets, daily run rate, projections

ACCOUNTS (all accounts with AR details)
    → Each account: tier, avg order, last order, AR status, payment history

TOP SELLERS / TRENDING / BACK IN STOCK
    → Product data for recommendations

PROMOS
    → Active promotions with deadlines and $ opportunity

AR SUMMARY
    → Overdue, flagged, due-soon filtered lists

SCENARIOS (6)
    1. Morning Check-In
    2. Gap to Target
    3. Smart Recommendations
    4. Store Visit Briefing
    5. AR/Payment Alerts
    6. Promo Alerts
```

### Claude API Call
- **Model:** `claude-sonnet-4-20250514`
- **Max tokens:** 1024
- **Direct browser access** (no backend proxy)
- Full conversation history sent with each request

---

## Quick Prompts / Scenarios

| # | Label | Trigger | Behavior |
|---|-------|---------|----------|
| 1 | Check-in | "How am I doing this month?" | MTD vs target, pace, projection |
| 2 | My Gap | "How far am I from my number?" | Gap in dollars, orders, visits |
| 3 | What to Push | "What should I push this week?" | Top 3 items with reasons |
| 4 | Store Visit | (opens store picker) | Pre-meeting briefing for selected store |
| 5 | AR Issues | "Any payment issues?" | Overdue, flagged, due-soon accounts |
| 6 | Promos | "Any promos closing soon?" | Deadlines, untapped stores, $ opportunity |

---

## Database Schema (Production Design)

The current POC uses hardcoded mock data. Below is the proposed relational schema for a production backend.

### Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────────┐       ┌──────────────┐
│    company    │       │    territory     │       │  sales_rep   │
├──────────────┤       ├──────────────────┤       ├──────────────┤
│ id (PK)      │       │ id (PK)          │       │ id (PK)      │
│ name         │       │ name             │       │ name         │
│ created_at   │       │ region           │       │ email        │
└──────────────┘       │ company_id (FK)  │       │ phone        │
                       └────────┬─────────┘       │ avatar       │
                                │                 │ territory_id │
                                └─────────────────┤ (FK)         │
                                                  │ created_at   │
                                                  └──────┬───────┘
                                                         │
                    ┌────────────────────────────────────┐│
                    │                                     │
              ┌─────▼──────┐                      ┌──────▼───────┐
              │ sales_target│                      │   account    │
              ├────────────┤                      ├──────────────┤
              │ id (PK)    │                      │ id (PK)      │
              │ rep_id (FK)│                      │ name         │
              │ month      │                      │ rep_id (FK)  │
              │ monthly_target│                   │ tier (A/B/C) │
              │ weekly_target │                   │ avg_order    │
              │ created_at │                      │ owner_name   │
              └────────────┘                      │ owner_phone  │
                                                  │ address      │
                    ┌─────────────────────────────┤ created_at   │
                    │                              └──────┬───────┘
                    │                                     │
              ┌─────▼──────┐                      ┌──────▼───────┐
              │   invoice  │                      │    order     │
              ├────────────┤                      ├──────────────┤
              │ id (PK)    │                      │ id (PK)      │
              │ account_id │                      │ account_id   │
              │ (FK)       │                      │ (FK)         │
              │ amount     │                      │ rep_id (FK)  │
              │ issued_date│                      │ total_amount │
              │ due_date   │                      │ order_date   │
              │ paid_date  │                      │ status       │
              │ status     │                      │ created_at   │
              │ created_at │                      └──────┬───────┘
              └────────────┘                             │
                                                  ┌──────▼───────┐
                                                  │  order_item  │
                                                  ├──────────────┤
                                                  │ id (PK)      │
                                                  │ order_id (FK)│
                                                  │ product_id   │
                                                  │ (FK)         │
                                                  │ quantity     │
                                                  │ unit_price   │
                                                  └──────────────┘

              ┌──────────────┐       ┌──────────────────┐
              │   product    │       │    promotion     │
              ├──────────────┤       ├──────────────────┤
              │ id (PK)      │       │ id (PK)          │
              │ name         │       │ name             │
              │ sku          │       │ description      │
              │ category     │       │ start_date       │
              │ unit_price   │       │ end_date         │
              │ status       │       │ discount_type    │
              │ (active/     │       │ discount_value   │
              │  back_in_    │       │ created_at       │
              │  stock/      │       └────────┬─────────┘
              │  discontinued│                │
              │ )            │       ┌────────▼─────────┐
              │ created_at   │       │ promo_account    │
              └──────────────┘       ├──────────────────┤
                                     │ id (PK)          │
                                     │ promotion_id(FK) │
                                     │ account_id (FK)  │
                                     │ ordered (bool)   │
                                     │ order_id (FK)    │
                                     └──────────────────┘
```

### Table Definitions

#### `company`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Unique identifier |
| name | VARCHAR(255) | Company name |
| created_at | TIMESTAMP | Record creation time |

#### `territory`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Unique identifier |
| name | VARCHAR(100) | Territory name (e.g., "East Bay") |
| region | VARCHAR(100) | Parent region |
| company_id | UUID (FK) | References `company.id` |

#### `sales_rep`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Unique identifier |
| name | VARCHAR(255) | Full name |
| email | VARCHAR(255) | Email address |
| phone | VARCHAR(20) | Phone number |
| avatar | VARCHAR(10) | Initials for display |
| territory_id | UUID (FK) | References `territory.id` |
| is_active | BOOLEAN | Whether rep is active |
| created_at | TIMESTAMP | Record creation time |

#### `sales_target`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Unique identifier |
| rep_id | UUID (FK) | References `sales_rep.id` |
| month | DATE | Target month (first of month) |
| monthly_target | DECIMAL(12,2) | Monthly sales target in dollars |
| weekly_target | DECIMAL(12,2) | Weekly sales target in dollars |
| created_at | TIMESTAMP | Record creation time |

#### `account`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Unique identifier |
| name | VARCHAR(255) | Store/business name |
| rep_id | UUID (FK) | References `sales_rep.id` |
| tier | ENUM('A','B','C') | Account tier classification |
| avg_order | DECIMAL(10,2) | Historical average order size |
| owner_name | VARCHAR(255) | Store owner/contact name |
| owner_phone | VARCHAR(20) | Owner phone |
| address | TEXT | Store address |
| payment_history | VARCHAR(255) | Payment behavior notes |
| is_active | BOOLEAN | Whether account is active |
| created_at | TIMESTAMP | Record creation time |

#### `order`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Unique identifier |
| account_id | UUID (FK) | References `account.id` |
| rep_id | UUID (FK) | References `sales_rep.id` |
| total_amount | DECIMAL(12,2) | Order total |
| order_date | TIMESTAMP | When order was placed |
| status | ENUM('pending','confirmed','delivered','cancelled') | Order status |
| created_at | TIMESTAMP | Record creation time |

#### `order_item`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Unique identifier |
| order_id | UUID (FK) | References `order.id` |
| product_id | UUID (FK) | References `product.id` |
| quantity | INTEGER | Units ordered |
| unit_price | DECIMAL(10,2) | Price per unit at time of order |

#### `invoice`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Unique identifier |
| account_id | UUID (FK) | References `account.id` |
| order_id | UUID (FK) | References `order.id` (nullable) |
| amount | DECIMAL(12,2) | Invoice amount |
| issued_date | DATE | Date invoice was issued |
| due_date | DATE | Payment due date |
| paid_date | DATE | Date payment was received (nullable) |
| status | ENUM('pending','paid','overdue','flagged') | Invoice status |
| created_at | TIMESTAMP | Record creation time |

#### `product`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Unique identifier |
| name | VARCHAR(255) | Product name |
| sku | VARCHAR(50) | Stock keeping unit |
| category | VARCHAR(100) | Product category |
| unit_price | DECIMAL(10,2) | Current unit price |
| status | ENUM('active','back_in_stock','discontinued') | Availability |
| created_at | TIMESTAMP | Record creation time |

#### `promotion`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Unique identifier |
| name | VARCHAR(255) | Promo display name (e.g., "Pocky 3-for-$10") |
| description | TEXT | Promo details |
| start_date | DATE | Promo start |
| end_date | DATE | Promo end |
| discount_type | ENUM('percentage','fixed','bundle') | Type of discount |
| discount_value | DECIMAL(10,2) | Discount amount or percentage |
| created_at | TIMESTAMP | Record creation time |

#### `promo_account`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Unique identifier |
| promotion_id | UUID (FK) | References `promotion.id` |
| account_id | UUID (FK) | References `account.id` |
| ordered | BOOLEAN | Whether account placed a promo order |
| order_id | UUID (FK) | References `order.id` (nullable) |

### Key Derived Queries

These replace the current hardcoded computed values:

```sql
-- MTD Sales for a rep
SELECT COALESCE(SUM(o.total_amount), 0) as mtd_sales
FROM "order" o
WHERE o.rep_id = :rep_id
  AND o.order_date >= DATE_TRUNC('month', CURRENT_DATE)
  AND o.status != 'cancelled';

-- Gap to target
SELECT st.monthly_target - COALESCE(SUM(o.total_amount), 0) as gap
FROM sales_target st
LEFT JOIN "order" o ON o.rep_id = st.rep_id
  AND o.order_date >= DATE_TRUNC('month', CURRENT_DATE)
  AND o.status != 'cancelled'
WHERE st.rep_id = :rep_id
  AND st.month = DATE_TRUNC('month', CURRENT_DATE)
GROUP BY st.monthly_target;

-- Overdue accounts
SELECT a.name, i.amount, i.due_date,
       CURRENT_DATE - i.due_date as days_past_due
FROM invoice i
JOIN account a ON a.id = i.account_id
WHERE a.rep_id = :rep_id
  AND i.status = 'overdue'
  AND i.paid_date IS NULL;

-- Promo opportunity (stores that haven't ordered)
SELECT p.name, p.end_date, a.name as store_name
FROM promotion p
JOIN promo_account pa ON pa.promotion_id = p.id
JOIN account a ON a.id = pa.account_id
WHERE a.rep_id = :rep_id
  AND pa.ordered = false
  AND p.end_date >= CURRENT_DATE;

-- Top sellers by velocity (reorder frequency)
SELECT pr.name, COUNT(oi.id) as reorder_count
FROM order_item oi
JOIN "order" o ON o.id = oi.order_id
JOIN product pr ON pr.id = oi.product_id
WHERE o.rep_id = :rep_id
  AND o.order_date >= CURRENT_DATE - INTERVAL '14 days'
GROUP BY pr.name
ORDER BY reorder_count DESC
LIMIT 5;

-- Last order per account
SELECT a.name, MAX(o.order_date) as last_order
FROM account a
LEFT JOIN "order" o ON o.account_id = a.id
WHERE a.rep_id = :rep_id
GROUP BY a.name;
```

### Indexes

```sql
CREATE INDEX idx_order_rep_date ON "order"(rep_id, order_date);
CREATE INDEX idx_order_account ON "order"(account_id);
CREATE INDEX idx_invoice_account_status ON invoice(account_id, status);
CREATE INDEX idx_invoice_due_date ON invoice(due_date) WHERE paid_date IS NULL;
CREATE INDEX idx_order_item_order ON order_item(order_id);
CREATE INDEX idx_order_item_product ON order_item(product_id);
CREATE INDEX idx_promo_account_promo ON promo_account(promotion_id);
CREATE INDEX idx_account_rep ON account(rep_id);
CREATE INDEX idx_sales_target_rep_month ON sales_target(rep_id, month);
```

---

## Deployment

### Docker (Current)

```
Dockerfile (multi-stage)
├── Stage 1: node:20-alpine → npm ci + npm run build
└── Stage 2: nginx:alpine → serves dist/ on port 3005

docker-compose.yml → maps port 3005:3005
nginx.conf → SPA routing with try_files fallback
```

### Environment Variables

```bash
VITE_ANTHROPIC_API_KEY       # Claude API key (baked into build)
VITE_ELEVENLABS_API_KEY      # ElevenLabs API key (baked into build)
VITE_ELEVENLABS_VOICE_ID     # Voice ID for TTS output
```

### Production Considerations

- API keys are currently exposed in the client bundle — a backend proxy is needed for production
- No authentication — rep selection is open
- No data persistence — conversation history is in-memory only
- All data is mock — needs ERP/CRM integration for real deployment

---

## Design System

### Aesthetic: "Warm Noir Cockpit"

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-deep` | `#08090c` | Page background |
| `--bg-base` | `#0e1015` | Base surface |
| `--bg-raised` | `#151820` | Elevated cards |
| `--accent` | `#d4915c` | Primary accent (copper/amber) |
| `--accent-light` | `#e8a849` | Light accent for highlights |
| `--green` | `#5ec4a0` | Positive status |
| `--yellow` | `#dba54e` | Warning status |
| `--red` | `#d46b6b` | Danger status |

### Typography

- **Display/Headings:** Plus Jakarta Sans (700-800 weight)
- **Body:** Figtree (400-600 weight)

### Visual Effects

- Frosted glass cards (`backdrop-filter: blur`)
- Subtle SVG noise texture overlay
- Copper/amber gradients on interactive elements
- Pulse animations on mic button (sine wave driven)
- Bottom sheet animation for store picker
