import React, { useRef, useEffect, useState } from 'react';
import { isKeyConfigured } from '../services/claude';

function renderMarkdown(text) {
  const lines = text.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Bullet points (- or •)
    if (/^\s*[-•]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-•]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-•]\s+/, ''));
        i++;
      }
      elements.push(
        <ul key={elements.length} style={{ margin: '4px 0', paddingLeft: 18 }}>
          {items.map((item, j) => (
            <li key={j} style={{ marginBottom: 2 }}>{inlineFormat(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Empty line = spacing
    if (line.trim() === '') {
      elements.push(<div key={elements.length} style={{ height: 8 }} />);
      i++;
      continue;
    }

    // Regular text line
    elements.push(<div key={elements.length}>{inlineFormat(line)}</div>);
    i++;
  }

  return elements;
}

function inlineFormat(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[-+~][^\]]+[-+~]\])/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('[+') && part.endsWith('+]')) {
      return <span key={i} className="val-good">{part.slice(2, -2)}</span>;
    }
    if (part.startsWith('[-') && part.endsWith('-]')) {
      return <span key={i} className="val-bad">{part.slice(2, -2)}</span>;
    }
    if (part.startsWith('[~') && part.endsWith('~]')) {
      return <span key={i} className="val-warn">{part.slice(2, -2)}</span>;
    }
    return part;
  });
}

const IconCheckin = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10" cy="10" r="7.5"/>
    <path d="M10 5.5v4.5l3 2"/>
  </svg>
);
const IconGap = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10" cy="10" r="7.5"/>
    <circle cx="10" cy="10" r="3"/>
    <path d="M10 2.5v2M10 15.5v2"/>
  </svg>
);
const IconPush = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="6" width="14" height="10" rx="1.5"/>
    <path d="M3 9h14M7 4v2M13 4v2"/>
  </svg>
);
const IconAR = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2.5" y="5" width="15" height="10" rx="1.5"/>
    <path d="M2.5 8.5h15"/>
    <path d="M5.5 12h3"/>
  </svg>
);
const IconPromos = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 5h8l3.5 5-3.5 5H4l3.5-5L4 5z"/>
  </svg>
);
const IconVisit = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 2.5c-3 0-5.5 2.3-5.5 5.2 0 4.3 5.5 9.8 5.5 9.8s5.5-5.5 5.5-9.8c0-2.9-2.5-5.2-5.5-5.2z"/>
    <circle cx="10" cy="7.8" r="2"/>
  </svg>
);

const IconHot = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 2c0 3-4 5-4 8a5 5 0 0010 0c0-3-4-5-4-8z"/>
    <path d="M10 18a2.5 2.5 0 002.5-2.5c0-1.5-2.5-3-2.5-3s-2.5 1.5-2.5 3A2.5 2.5 0 0010 18z"/>
  </svg>
);
const IconCatalog = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 4h4l3 2h7v10H3V4z"/>
    <path d="M8 12l2 2 4-4"/>
  </svg>
);

const IconTrends = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 16l4-5 3 3 7-9"/>
    <path d="M14 5h3v3"/>
  </svg>
);

const QUICK_PROMPTS = [
  { icon: IconCheckin, label: "Check-in", text: "Hey, how am I doing this month?" },
  { icon: IconGap, label: "My Gap", text: "How far am I from hitting my number?" },
  { icon: IconHot, label: "Hot Items", text: "What are today's top hot items on Weee that we should push across all stores?" },
  { icon: IconVisit, label: "Store Visit", text: null, needsStore: true },
  { icon: IconCatalog, label: "Catalog Match", text: "Which of today's Weee hot items do we carry, or what's the closest US Trading alternative?" },
  { icon: IconTrends, label: "Trends", text: null, needsStore: true, storePrompt: "trends" },
  { icon: IconPush, label: "What to Push", text: "What should I be pushing this week?" },
  { icon: IconAR, label: "AR Issues", text: "Any payment issues I should know about?" },
  { icon: IconPromos, label: "Promos", text: "What promos are closing soon?" },
];

export { QUICK_PROMPTS };

export default function ChatView({ rep, messages, thinking, error, onSend }) {
  const scrollRef = useRef(null);
  const [showStorePicker, setShowStorePicker] = useState(false);
  const [storePickerMode, setStorePickerMode] = useState("visit"); // "visit" or "trends"

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  const handleQuickPrompt = (q) => {
    if (q.needsStore) {
      setStorePickerMode(q.storePrompt || "visit");
      setShowStorePicker(true);
    } else {
      onSend(q.text);
    }
  };

  const handleStorePick = (storeName) => {
    setShowStorePicker(false);
    if (storePickerMode === "trends") {
      onSend(`How does ${storeName} compare to other stores in its tier? Show me their category trends — where are they ahead, where are they falling behind, and what should I push to close the gaps?`);
    } else {
      onSend(`I'm heading to ${storeName} now. Give me a quick briefing — what do I need to know before I walk in? Any AR issues, recent order history, items to push, or promos I should mention?`);
    }
  };

  if (messages.length === 0) {
    return (
      <div className="chat-area">
        <div className="empty-state">
          <div className="empty-orb">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="20" stroke="rgba(0,0,0,.15)" strokeWidth="1.5"/>
              <circle cx="24" cy="24" r="13" stroke="rgba(0,0,0,.08)" strokeWidth="1"/>
              <circle cx="24" cy="24" r="5" fill="rgba(0,0,0,.15)"/>
              <circle cx="24" cy="24" r="2" fill="rgba(0,0,0,.4)"/>
            </svg>
          </div>
          <div className="empty-title">Hey {rep.name.split(' ')[0]}, ready when you are</div>
          <div className="empty-sub">Tap the mic or pick a quick prompt</div>

          {!isKeyConfigured() && (
            <div className="key-warning">
              Set VITE_ANTHROPIC_API_KEY in your .env to enable AI responses
            </div>
          )}

          <div className="q-grid">
            {QUICK_PROMPTS.map((q, i) => (
              <button key={i} className="q-btn" onClick={() => handleQuickPrompt(q)}>
                <span className="q-icon"><q.icon /></span>
                <span style={{ fontSize: 12, fontWeight: 500 }}>{q.label}</span>
              </button>
            ))}
          </div>
        </div>

        {showStorePicker && (
          <>
            <div className="overlay" onClick={() => setShowStorePicker(false)} />
            <div className="store-picker">
              <div className="store-picker-title">Where are you heading?</div>
              <div className="store-picker-list">
                {rep.accounts.map((a, i) => (
                  <button key={i} className="store-picker-item" onClick={() => handleStorePick(a.name)}>
                    <div className="tier-badge">{a.tier}</div>
                    <div className="store-picker-info">
                      <div className="store-picker-name">{a.name}</div>
                      <div className="store-picker-detail">Last order {a.lastOrder}</div>
                    </div>
                    <div className={`store-picker-status ${a.arStatus === 'current' ? 'c-green' : a.arStatus === 'overdue' ? 'c-yellow' : 'c-red'}`}>
                      {a.arStatus}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="chat-area">
      {messages.map((m, i) => (
        <div key={i} className={`msg-row ${m.role}`}>
          {m.role === 'assistant' && <div className="ai-dot">AI</div>}
          <div className={`bubble ${m.role}`}>
            {m.role === 'assistant' ? renderMarkdown(m.text) : m.text}
          </div>
        </div>
      ))}
      {thinking && (
        <div className="msg-row assistant">
          <div className="ai-dot">AI</div>
          <div className="bubble assistant">
            <span className="dots">
              <span className="dot" style={{ animationDelay: '0s' }} />
              <span className="dot" style={{ animationDelay: '0.15s' }} />
              <span className="dot" style={{ animationDelay: '0.3s' }} />
            </span>
          </div>
        </div>
      )}
      {error && <div className="err-banner">{error}</div>}
      <div ref={scrollRef} />
    </div>
  );
}
