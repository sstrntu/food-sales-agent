import { useState, useEffect, useRef, useCallback } from 'react';
import { loadReps } from './data/reps';
import { useConversation } from './hooks/useConversation';
import Dashboard from './components/Dashboard';
import ChatView, { QUICK_PROMPTS } from './components/ChatView';
import './styles.css';

export default function App() {
  const [repId, setRepId] = useState("jimmy");
  const [repsData, setRepsData] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [showReps, setShowReps] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState("chat");
  const [tick, setTick] = useState(0);
  const [showStorePicker, setShowStorePicker] = useState(false);
  const [storePickerMode, setStorePickerMode] = useState("visit");
  const [convActive, setConvActive] = useState(false);
  const [streamingText, setStreamingText] = useState(null);

  const historyRef = useRef([]);

  useEffect(() => {
    loadReps()
      .then(data => { setRepsData(data); setDataLoading(false); })
      .catch(err => { setError('Failed to load data: ' + err.message); setDataLoading(false); });
  }, []);

  const rep = repsData?.[repId];
  const gap = rep ? rep.monthlyTarget - rep.mtdSales : 0;
  const pct = rep ? Math.round((rep.mtdSales / rep.monthlyTarget) * 100) : 0;

  useEffect(() => {
    setMessages([]);
    historyRef.current = [];
    setError("");
    setStreamingText(null);
  }, [repId]);

  // ── Conversation callbacks ────────────────────────────────────────────────────

  const handleConvUserMessage = useCallback((text) => {
    setMessages(prev => [...prev, { role: "user", text }]);
    setStreamingText('');
  }, []);

  const handleConvChunk = useCallback((accumulatedText) => {
    setStreamingText(accumulatedText);
  }, []);

  const handleConvDone = useCallback((fullText) => {
    setStreamingText(null);
    setMessages(prev => [...prev, { role: "assistant", text: fullText }]);
  }, []);

  const conversation = useConversation({
    rep,
    historyRef,
    onUserMessage: handleConvUserMessage,
    onAssistantChunk: handleConvChunk,
    onAssistantDone: handleConvDone,
  });

  // ── Send (typed input or quick prompts) ──────────────────────────────────────

  const handleSend = useCallback((text) => {
    const msg = text || input.trim();
    if (!msg) return;
    setInput("");
    conversation.sendText(msg);
  }, [input, conversation]);

  // ── Mic button = conversation toggle ─────────────────────────────────────────

  const toggleConversation = useCallback(() => {
    if (convActive) {
      conversation.stopConversation();
      setConvActive(false);
    } else {
      conversation.startConversation();
      setConvActive(true);
    }
  }, [convActive, conversation]);

  const { state: convState, error: convError, muted: convMuted } = conversation;
  const isListening = convState === 'listening';
  const isSpeaking = convState === 'speaking';
  const isThinking = convState === 'processing';
  const activeError = convError || error;

  // Pulse animation
  useEffect(() => {
    if (isListening || isSpeaking || isThinking) {
      const i = setInterval(() => setTick(t => t + 1), 60);
      return () => clearInterval(i);
    }
  }, [isListening, isSpeaking, isThinking]);

  const pulseMag = Math.sin(tick * 0.1) * 0.5 + 0.5;

  const hintText = convActive
    ? (convMuted ? "Muted — tap mic icon to unmute"
      : isListening ? "Listening — speak anytime..."
      : isSpeaking ? "Speaking — tap mic to stop"
      : isThinking ? "Thinking..."
      : "Tap mic to start talking")
    : "Tap mic to start conversation";

  if (dataLoading || !rep) {
    return (
      <div className="shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none" style={{ marginBottom: 12, opacity: 0.4 }}>
            <circle cx="18" cy="18" r="15" stroke="currentColor" strokeWidth="2" strokeDasharray="70" strokeDashoffset="20">
              <animateTransform attributeName="transform" type="rotate" from="0 18 18" to="360 18 18" dur="1s" repeatCount="indefinite"/>
            </circle>
          </svg>
          <div style={{ fontSize: 13, fontWeight: 500 }}>
            {error ? error : 'Loading data...'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="shell">
      {/* Top Bar */}
      <div className="top-bar">
        <div className="rep-btn" onClick={() => setShowReps(!showReps)}>
          <div className="avatar">{rep.avatar}</div>
          <div>
            <div className="rep-name">{rep.name}</div>
            <div className="rep-territory">{rep.territory}</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 14 14" className="caret">
            <path d="M3.5 5.5L7 9L10.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
        </div>
        {messages.length > 0 && (
          <button className="new-chat-btn" onClick={() => {
            setMessages([]); historyRef.current = []; setError(""); setStreamingText(null);
            conversation.stopConversation(); setConvActive(false); setView('chat');
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M13.5 2.5l-11 11M8 2.5h5.5V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>New Chat</span>
          </button>
        )}
      </div>

      {/* View Toggle */}
      <div className="view-toggle">
        <button className={`view-tab ${view === 'chat' ? 'active' : ''}`} onClick={() => setView('chat')}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M3 4.5C3 3.67 3.67 3 4.5 3h9c.83 0 1.5.67 1.5 1.5v7c0 .83-.67 1.5-1.5 1.5H6.5L3 16V4.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="view-tab-label">Chat</span>
        </button>
        <button className={`view-tab ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="2" y="2" width="5.5" height="5.5" rx="1.2" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="10.5" y="2" width="5.5" height="5.5" rx="1.2" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="2" y="10.5" width="5.5" height="5.5" rx="1.2" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="10.5" y="10.5" width="5.5" height="5.5" rx="1.2" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
          <span className="view-tab-label">Dashboard</span>
        </button>
      </div>

      {/* Rep Dropdown */}
      {showReps && <div className="overlay" onClick={() => setShowReps(false)} />}
      {showReps && (
        <div className="dropdown">
          {Object.values(repsData).map(r => {
            const p = Math.round((r.mtdSales / r.monthlyTarget) * 100);
            return (
              <div key={r.id} className={`drop-item ${r.id === repId ? 'selected' : ''}`}
                onClick={() => { setRepId(r.id); setShowReps(false); }}>
                <div className="avatar sm">{r.avatar}</div>
                <div className="drop-info">
                  <div className="drop-name">{r.name}</div>
                  <div className="drop-sub">{r.territory} &middot; {p}% to goal</div>
                </div>
                <div className={`pct-badge ${p >= 75 ? 'green' : p >= 50 ? 'yellow' : 'red'}`}>{p}%</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Stats Strip */}
      <div className="stats-strip">
        <div className="stat">
          <div className="stat-lbl">MTD</div>
          <div className="stat-val">${(rep.mtdSales / 1000).toFixed(1)}k</div>
        </div>
        <div className="stat-div" />
        <div className="stat">
          <div className="stat-lbl">Target</div>
          <div className="stat-val">${(rep.monthlyTarget / 1000).toFixed(0)}k</div>
        </div>
        <div className="stat-div" />
        <div className="stat">
          <div className="stat-lbl">Gap</div>
          <div className={`stat-val ${pct >= 75 ? 'c-green' : pct >= 50 ? 'c-yellow' : 'c-red'}`}>
            ${(gap / 1000).toFixed(1)}k
          </div>
        </div>
        <div className="stat-div" />
        <div className="stat">
          <div className="stat-lbl">Days Left</div>
          <div className="stat-val">{rep.businessDaysLeft}</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="prog-bg">
        <div className={`prog-fill ${pct >= 75 ? 'green' : pct >= 50 ? 'yellow' : 'red'}`}
          style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>

      {/* Main Area */}
      {view === 'dashboard' ? (
        <Dashboard rep={rep} />
      ) : (
        <ChatView
          rep={rep}
          messages={messages}
          thinking={isThinking}
          error={activeError}
          onSend={handleSend}
          streamingText={streamingText}
        />
      )}

      {/* Bottom Input */}
      <div className="bottom">
        {messages.length > 0 && view === 'chat' && (
          <div className="chip-scroll">
            {QUICK_PROMPTS.map((q, i) => (
              <button key={i} className="chip" onClick={() => {
                if (q.needsStore) { setStorePickerMode(q.storePrompt || "visit"); setShowStorePicker(true); }
                else handleSend(q.text);
              }}>{q.label}</button>
            ))}
          </div>
        )}
        {showStorePicker && (
          <>
            <div className="overlay" onClick={() => setShowStorePicker(false)} />
            <div className="store-picker">
              <div className="store-picker-title">{storePickerMode === "trends" ? "Compare which store?" : "Where are you heading?"}</div>
              <div className="store-picker-list">
                {rep.accounts.map((a, i) => (
                  <button key={i} className="store-picker-item" onClick={() => {
                    setShowStorePicker(false);
                    if (storePickerMode === "trends") {
                      handleSend(`How does ${a.name} compare to other stores in its tier? Show me their category trends — where are they ahead, where are they falling behind, and what should I push to close the gaps?`);
                    } else {
                      handleSend(`I'm heading to ${a.name} now. Give me a quick briefing — what do I need to know before I walk in? Any AR issues, recent order history, items to push, or promos I should mention?`);
                    }
                  }}>
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
        <div className="input-row">
          <input
            className="text-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Type or tap mic to speak..."
            disabled={isThinking}
          />
          {convActive && !input.trim() && (
            <button
              className={`mute-btn ${convMuted ? 'muted' : ''}`}
              onClick={() => convMuted ? conversation.unmuteMic() : conversation.muteMic()}
              title={convMuted ? 'Unmute mic' : 'Mute mic'}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="7" y="2" width="6" height="10" rx="3" fill="currentColor"/>
                <path d="M4.5 9.5a5.5 5.5 0 0011 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
                <line x1="10" y1="15" x2="10" y2="18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
                <line x1="2" y1="2" x2="18" y2="18" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/>
              </svg>
            </button>
          )}
          {input.trim() ? (
            <button className="send-btn" onClick={() => handleSend()} disabled={isThinking}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M3 9h12M11 5l4 4-4 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          ) : (
            <button
              className={`mic-btn ${convActive ? 'conv-mode' : ''} ${isListening && !convMuted ? 'listening' : ''} ${isSpeaking ? 'speaking' : ''} ${convMuted ? 'muted' : ''}`}
              style={{
                boxShadow: convActive
                  ? (isSpeaking
                    ? `0 0 ${12 + pulseMag * 16}px rgba(129,140,248,.35)`
                    : isListening
                    ? `0 0 ${12 + pulseMag * 16}px rgba(52,211,153,.4)`
                    : isThinking
                    ? `0 0 ${12 + pulseMag * 10}px rgba(251,191,36,.3)`
                    : `0 0 12px rgba(52,211,153,.3)`)
                  : '0 4px 14px rgba(99,102,241,.35)',
                transform: (isListening || isSpeaking || isThinking) ? `scale(${1 + pulseMag * .04})` : 'scale(1)',
                background: convActive
                  ? (isSpeaking ? 'linear-gradient(135deg, #818cf8, #6366f1)'
                    : isThinking ? 'linear-gradient(135deg, #fbbf24, #f59e0b)'
                    : 'linear-gradient(135deg, #34d399, #10b981)')
                  : undefined,
              }}
              onClick={toggleConversation}
            >
              {convActive ? (
                isSpeaking ? (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <rect x="3" y="7" width="2" height="6" rx="1" fill="white"><animate attributeName="height" values="6;10;6" dur="0.8s" repeatCount="indefinite"/><animate attributeName="y" values="7;5;7" dur="0.8s" repeatCount="indefinite"/></rect>
                    <rect x="7" y="5" width="2" height="10" rx="1" fill="white"><animate attributeName="height" values="10;4;10" dur="0.6s" repeatCount="indefinite"/><animate attributeName="y" values="5;8;5" dur="0.6s" repeatCount="indefinite"/></rect>
                    <rect x="11" y="6" width="2" height="8" rx="1" fill="white"><animate attributeName="height" values="8;12;8" dur="0.7s" repeatCount="indefinite"/><animate attributeName="y" values="6;4;6" dur="0.7s" repeatCount="indefinite"/></rect>
                    <rect x="15" y="7" width="2" height="6" rx="1" fill="white"><animate attributeName="height" values="6;9;6" dur="0.9s" repeatCount="indefinite"/><animate attributeName="y" values="7;5.5;7" dur="0.9s" repeatCount="indefinite"/></rect>
                  </svg>
                ) : isThinking ? (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="5" cy="10" r="2" fill="white"><animate attributeName="opacity" values="0.3;1;0.3" dur="1.2s" repeatCount="indefinite" begin="0s"/></circle>
                    <circle cx="10" cy="10" r="2" fill="white"><animate attributeName="opacity" values="0.3;1;0.3" dur="1.2s" repeatCount="indefinite" begin="0.2s"/></circle>
                    <circle cx="15" cy="10" r="2" fill="white"><animate attributeName="opacity" values="0.3;1;0.3" dur="1.2s" repeatCount="indefinite" begin="0.4s"/></circle>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <rect x="7" y="2" width="6" height="10" rx="3" fill="white"/>
                    <path d="M4.5 9.5a5.5 5.5 0 0011 0" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                    <line x1="10" y1="15" x2="10" y2="18" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                )
              ) : (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <rect x="7" y="2" width="6" height="10" rx="3" fill="white"/>
                  <path d="M4.5 9.5a5.5 5.5 0 0011 0" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                  <line x1="10" y1="15" x2="10" y2="18" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              )}
            </button>
          )}
        </div>
        <div className="hint">{hintText}</div>
      </div>
    </div>
  );
}
