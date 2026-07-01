import { useEffect, useRef, useState } from "react";

// Speech-to-text hook using the browser Web Speech API (SpeechRecognition).
// Returns { supported, listening, transcript, start, stop, reset }.
export function useVoice({ onResult } = {}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    setSupported(true);
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      setTranscript(text);
      if (event.results[event.results.length - 1].isFinal && onResult) {
        onResult(text);
      }
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;

    return () => recognition.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = () => {
    if (!recognitionRef.current || listening) return;
    setTranscript("");
    setListening(true);
    try {
      recognitionRef.current.start();
    } catch {
      setListening(false);
    }
  };

  const stop = () => recognitionRef.current?.stop();
  const reset = () => setTranscript("");

  return { supported, listening, transcript, start, stop, reset };
}
