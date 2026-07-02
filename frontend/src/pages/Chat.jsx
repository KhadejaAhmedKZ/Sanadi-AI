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

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export default function Chat() {
  const { user } = useAuth();
  const { settings, speak } = useAccessibility();
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: `Hi ${user?.name?.split(" ")[0] || "there"}! I'm Sanadi, your AI healthcare companion. My specialist agents can help with medical questions, appointments, medications, rehabilitation and more. You can also attach a photo — like a rash, wound, or medication label — for the Clinical agent to review. What can I do for you?`,
      agents: ["orchestrator"],
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingImage, setPendingImage] = useState(null); // { file, previewUrl }
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);

  const voice = useVoice({ onResult: (t) => setInput(t) });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  useEffect(() => {
    // Release the object URL when replaced/unmounted to avoid leaking memory.
    return () => {
      if (pendingImage) URL.revokeObjectURL(pendingImage.previewUrl);
    };
  }, [pendingImage]);

  function onPickImage(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessages((m) => [...m, { role: "bot", text: "⚠️ Please choose an image file (JPEG, PNG, or WebP).", agents: [] }]);
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setMessages((m) => [...m, { role: "bot", text: "⚠️ That image is too large (max 8MB).", agents: [] }]);
      return;
    }
    setPendingImage({ file, previewUrl: URL.createObjectURL(file) });
  }

  function removePendingImage() {
    setPendingImage(null);
  }

  async function send(text) {
    if (pendingImage) {
      await sendImage();
      return;
    }
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
      if (settings.voiceEnabled || settings.screenReader) speak(res.reply);
    } catch (err) {
      setMessages((m) => [...m, { role: "bot", text: `⚠️ ${err.message}`, agents: [] }]);
    } finally {
      setSending(false);
    }
  }

  async function sendImage() {
    if (!pendingImage || sending) return;
    if (user?.role !== "patient") {
      setMessages((m) => [...m, { role: "bot", text: "Image analysis is available for patient accounts.", agents: [] }]);
      setPendingImage(null);
      return;
    }

    const caption = input.trim();
    const { file, previewUrl } = pendingImage;
    setMessages((m) => [...m, { role: "user", text: caption, image: previewUrl }]);
    setInput("");
    setPendingImage(null);
    setSending(true);
    try {
      const res = await api.chatWithImage(user.id, file, caption);
      const botMsg = {
        role: "bot",
        text: res.reply,
        agents: res.agents_used,
        emergency: res.emergency,
      };
      setMessages((m) => [...m, botMsg]);
      if (settings.voiceEnabled || settings.screenReader) speak(res.reply);
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
            {m.image && <img src={m.image} alt="Attached" className="chat-msg-image" />}
            {m.text && <div>{m.text}</div>}
            {m.role === "bot" && m.agents?.length > 0 && (
              <div className="agents-row">
                {m.agents.map((a) => <AgentBadge key={a} name={a} />)}
              </div>
            )}
          </div>
        ))}
        {sending && (
          <div className="msg bot">
            <span className="pulse">🧠 {pendingImage ? "Analyzing your photo…" : "Coordinating agents…"}</span>
          </div>
        )}
      </div>

      {pendingImage && (
        <div className="chat-image-preview">
          <img src={pendingImage.previewUrl} alt="Selected" />
          <span className="muted" style={{ fontSize: ".82rem" }}>Ready to send — add a caption if you like</span>
          <button className="btn ghost sm" onClick={removePendingImage}>✕ Remove</button>
        </div>
      )}

      <div className="chat-input-bar">
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={onPickImage}
        />
        <button
          className="mic-btn"
          onClick={() => fileInputRef.current?.click()}
          title="Attach a photo for the Clinical agent to review"
          aria-label="Attach photo"
        >
          📷
        </button>
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
          placeholder={
            voice.listening ? "Listening…" : pendingImage ? "Add a caption (optional)…" : "Type your message…"
          }
        />
        <button className="btn" onClick={() => send()} disabled={sending || (!input.trim() && !pendingImage)}>
          {sending ? "…" : pendingImage ? "Send photo" : "Send"} ➤
        </button>
      </div>
    </div>
  );
}
