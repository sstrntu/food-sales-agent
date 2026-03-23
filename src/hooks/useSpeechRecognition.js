import { useRef, useCallback, useState } from 'react';

export function useSpeechRecognition(onResult) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const recogRef = useRef(null);

  const start = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setError("Speech recognition requires Chrome");
      return;
    }

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => setListening(true);
    recognition.onresult = (e) => {
      setListening(false);
      onResult(e.results[0][0].transcript);
    };
    recognition.onerror = (e) => {
      setListening(false);
      if (e.error !== "no-speech") setError("Mic: " + e.error);
    };
    recognition.onend = () => setListening(false);

    recogRef.current = recognition;
    recognition.start();
  }, [onResult]);

  const stop = useCallback(() => {
    recogRef.current?.stop();
    setListening(false);
  }, []);

  return { listening, error, start, stop, clearError: () => setError("") };
}
