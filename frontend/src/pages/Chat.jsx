import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useAccessibility } from "../context/AccessibilityContext.jsx";
import { useVoice } from "../hooks/useVoice.js";
import { api } from "../api/client.js";
import { AgentBadge } from "../components/ui.jsx";

const SUGGESTIONS = [
  "What does my medication do?",
  "Book a checkup for next Monday at 10am",
  "I have knee pain after physiotherapy",
  "Show my recovery progress",
  "Help me with breathing exercises",
];

export default function Chat() {
  const { user } = useAuth();
  const { settings, speak } = useAccessibility();
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: `Hi ${user?.name?.split(" ")[0] || "there"}! I'm Sanadi, your AI healthcare companion. My specialist agents can help with medical questions, appointments, medications, rehabilitation and more. What can I do for you?`,
      agents: ["orchestrator"],
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  const voice = useVoice({ onResult: (t) => setInput(t) });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function send(text) {
    const msg = (text ?? input).trim();
    if (!msg || sending) return;
    if (user?.role !== "patient") {
      setMessages((m) => [...m, { role: "user", text: msg }, {
        role: "bot",
        text: "The AI chat companion is available for patient accounts. Switch to a patient account to try it.",
        agents: ["orchestrator"],
      }]);
      setInput("");
      return;
    }

    setMessages((m) => [...m, { role: "user", text: msg }]);
    setInput("");
    setSending(true);
    try {
      const res = await api.chat(user.id, msg);
      const botMsg = {
        role: "bot",
        text: res.reply,
        agents: res.agents_used,
        emergency: res.emergency,
      };
      setMessages((m) => [...m, botMsg]);
      if (settings.voiceEnabled) speak(res.reply);
    } catch (err) {
      setMessages((m) => [...m, { role: "bot", text: `⚠️ ${err.message}`, agents: [] }]);
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="chat-window">
      <div className="suggestions">
        {SUGGESTIONS.map((s) => (
          <button key={s} onClick={() => send(s)} disabled={sending}>{s}</button>
        ))}
      </div>

      <div className="chat-scroll" ref={scrollRef}>
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}${m.emergency ? " emergency" : ""}`}>
            <div>{m.text}</div>
            {m.role === "bot" && m.agents?.length > 0 && (
              <div className="agents-row">
                {m.agents.map((a) => <AgentBadge key={a} name={a} />)}
              </div>
            )}
          </div>
        ))}
        {sending && (
          <div className="msg bot">
            <span className="pulse">🧠 Coordinating agents…</span>
          </div>
        )}
      </div>

      <div className="chat-input-bar">
        {voice.supported && (
          <button
            className={`mic-btn${voice.listening ? " listening" : ""}`}
            onClick={() => (voice.listening ? voice.stop() : voice.start())}
            title="Speak"
            aria-label="Voice input"
          >
            {voice.listening ? "⏹️" : "🎤"}
          </button>
        )}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={voice.listening ? "Listening…" : "Type your message…"}
        />
        <button className="btn" onClick={() => send()} disabled={sending || !input.trim()}>
          {sending ? "…" : "Send"} ➤
        </button>
      </div>
    </div>
  );
}
