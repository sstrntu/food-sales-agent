# Tap-to-Talk — Archived Implementation

Removed in favor of conversation mode (WebSocket streaming). Kept here for reference.

## How it worked

User taps mic → one-shot STT → REST call to Claude → REST call to ElevenLabs → play audio blob. No streaming, no auto-listen, no barge-in.

## Files involved

- `src/hooks/useSpeechRecognition.js` — still exists, powers the one-shot STT
- `src/services/claude.js` — REST `/api/chat` endpoint (still exists)
- `src/services/elevenlabs.js` — REST `/api/speak` endpoint (still exists)

## App.jsx code to restore

### State
```js
const [speaking_, setSpeaking] = useState(false);
const [thinking, setThinking] = useState(false);
const usedMicRef = useRef(false);
```

### Imports
```js
import { callClaude, isKeyConfigured } from './services/claude';
import { speak, stopSpeaking } from './services/elevenlabs';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
```

### handleSend (legacy path)
```js
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
    setMessages(prev => [...prev, { role: "assistant", text: "Having trouble connecting." }]);
  }
}, [input, rep]);
```

### Speech recognition hook
```js
const handleMicResult = useCallback((text) => {
  usedMicRef.current = true;
  handleSend(text);
}, [handleSend]);

const { listening, error: micError, start: startListening, stop: stopListening } =
  useSpeechRecognition(handleMicResult);
```

### Mic button (tap-to-talk)
```jsx
<button
  className={`mic-btn ${listening ? 'listening' : ''} ${speaking_ ? 'speaking' : ''}`}
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
```

### Hint text
```js
const hintText = listening ? "Listening..."
  : speaking_ ? "Speaking — tap to stop"
  : thinking ? "Thinking..."
  : "";
```
