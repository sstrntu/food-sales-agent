import { useState, useEffect, useRef, useCallback } from 'react';
import { REPS } from './data/reps';
import { callClaude, isKeyConfigured } from './services/claude';
import { speak, stopSpeaking, isVoiceConfigured } from './services/elevenlabs';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import Dashboard from './components/Dashboard';
import ChatView, { QUICK_PROMPTS } from './components/ChatView';
import './styles.css';

export default function App() {
  const [repId, setRepId] = useState("jimmy");
  const [messages, setMessages] = useState([]);
  const [speaking_, setSpeaking] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [input, setInput] = useState("");
  const [showReps, setShowReps] = useState(false);
  const usedMicRef = useRef(false);
  const [error, setError] = useState("");
  const [view, setView] = useState("chat");
  const [tick, setTick] = useState(0);
  const [showStorePicker, setShowStorePicker] = useState(false);
  const [storePickerMode, setStorePickerMode] = useState("visit");

  const historyRef = useRef([]);
  const rep = REPS[repId];
  const gap = rep.monthlyTarget - rep.mtdSales;
  const pct = Math.round((rep.mtdSales / rep.monthlyTarget) * 100);

  // Reset on rep switch
  useEffect(() => {
    setMessages([]);
    historyRef.current = [];
    setError("");
  }, [repId]);

  // Send message handler
  const handleSend = useCallback(async (text) => {
    const msg = text || input.trim();
    if (!msg) return;
    const shouldSpeak = usedMicRef.current;
    usedMicRef.current = false;
    setInput("");
    setError("");
    setMessages(prev => [...prev, { role: "user", text: msg }]);
    setThinking(true);

    historyRef.current.push({ role: "user", content: msg });

    try {
      const reply = await callClaude(rep, historyRef.current);
      historyRef.current.push({ role: "assistant", content: reply });
      setMessages(prev => [...prev, { role: "assistant", text: reply }]);
      setThinking(false);

      // TTS only when input was via mic
      if (shouldSpeak) {
        const audio = await speak(reply);
        if (audio) {
          setSpeaking(true);
          audio.onended = () => setSpeaking(false);
          audio.onerror = () => setSpeaking(false);
          audio.play();
        }
      }
    } catch (err) {
      setThinking(false);
      setError(err.message);
      setMessages(prev => [...prev, { role: "assistant", text: "Having trouble connecting. Check API configuration." }]);
    }
  }, [input, rep]);

  // Speech recognition — flag mic usage so TTS activates for the response
  const handleMicResult = useCallback((text) => {
    usedMicRef.current = true;
    handleSend(text);
  }, [handleSend]);
  const { listening, error: micError, start: startListening, stop: stopListening } = useSpeechRecognition(handleMicResult);

  // Pulse animation for mic
  useEffect(() => {
    if (listening || speaking_) {
      const i = setInterval(() => setTick(t => t + 1), 60);
      return () => clearInterval(i);
    }
  }, [listening, speaking_]);

  useEffect(() => {
    if (micError) setError(micError);
  }, [micError]);

  // Pulse value for animations
  const pulseMag = Math.sin(tick * 0.1) * 0.5 + 0.5;

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
          <button className="new-chat-btn" onClick={() => { setMessages([]); historyRef.current = []; setError(""); stopSpeaking(); setSpeaking(false); setView('chat'); }}>
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
          {Object.values(REPS).map(r => {
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
          thinking={thinking}
          error={error}
          onSend={handleSend}
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
            placeholder="Ask about your targets, accounts, promos..."
            disabled={thinking}
          />
          {input.trim() ? (
            <button className="send-btn" onClick={() => handleSend()} disabled={thinking}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M3 9h12M11 5l4 4-4 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          ) : (
            <button
              className={`mic-btn ${listening ? 'listening' : ''} ${speaking_ ? 'speaking' : ''}`}
              style={{
                boxShadow: listening
                  ? `0 0 ${12 + pulseMag * 16}px rgba(239,68,68,.4)`
                  : speaking_
                  ? `0 0 ${12 + pulseMag * 16}px rgba(129,140,248,.35)`
                  : '0 4px 14px rgba(99,102,241,.35)',
                transform: (listening || speaking_) ? `scale(${1 + pulseMag * .04})` : 'scale(1)',
              }}
              onClick={() => {
                if (speaking_) { stopSpeaking(); setSpeaking(false); }
                else if (listening) stopListening();
                else startListening();
              }}
              disabled={thinking}
            >
              {speaking_ ? (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <rect x="4" y="4" width="4.5" height="12" rx="1.2" fill="white"/>
                  <rect x="11.5" y="4" width="4.5" height="12" rx="1.2" fill="white"/>
                </svg>
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
        <div className="hint">
          {listening ? "Listening..." : speaking_ ? "Speaking — tap to stop" : thinking ? "Thinking..." : !isKeyConfigured() ? "API key needed" : ""}
        </div>
      </div>
    </div>
  );
}
