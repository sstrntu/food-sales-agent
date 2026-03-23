import React, { useRef, useEffect } from 'react';
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
            <li key={j} style={{ marginBottom: 2 }}>{inlineBold(item)}</li>
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
    elements.push(<div key={elements.length}>{inlineBold(line)}</div>);
    i++;
  }

  return elements;
}

function inlineBold(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

const QUICK_PROMPTS = [
  { icon: "☀️", label: "Check-in", text: "Hey, how am I doing this month?" },
  { icon: "🎯", label: "My Gap", text: "How far am I from hitting my number?" },
  { icon: "📦", label: "What to Push", text: "What should I be pushing this week?" },
  { icon: "💰", label: "AR Issues", text: "Any payment issues I should know about?" },
  { icon: "⏰", label: "Promos", text: "What promos are closing soon?" },
];

export { QUICK_PROMPTS };

export default function ChatView({ rep, messages, thinking, error, onSend }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  if (messages.length === 0) {
    return (
      <div className="chat-area">
        <div className="empty-state">
          <div className="empty-orb">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="20" stroke="rgba(212,145,92,.25)" strokeWidth="1.5"/>
              <circle cx="24" cy="24" r="13" stroke="rgba(212,145,92,.15)" strokeWidth="1"/>
              <circle cx="24" cy="24" r="5" fill="rgba(212,145,92,.3)"/>
              <circle cx="24" cy="24" r="2" fill="rgba(232,168,73,.6)"/>
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
              <button key={i} className="q-btn" onClick={() => onSend(q.text)}>
                <span style={{ fontSize: 18 }}>{q.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 500 }}>{q.label}</span>
              </button>
            ))}
          </div>
        </div>
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
