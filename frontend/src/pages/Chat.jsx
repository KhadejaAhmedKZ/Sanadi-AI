import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext.jsx";
import { useAccessibility } from "../context/AccessibilityContext.jsx";
import { useVoice } from "../hooks/useVoice.js";
import { api } from "../api/client.js";
import Markdown from "../components/Markdown.jsx";
import AgentStatusBoard from "../components/AgentStatusBoard.jsx";

// Each role gets its own assistant: patients talk to the multi-agent
// orchestrator; caregivers get a care-support companion grounded in their
// linked patient's data; providers get a clinical copilot over the panel.
const ROLE_CHAT = {
  patient: {
    welcome: (name) =>
      `Hi ${name}! I'm Sanadi, your AI healthcare companion. My specialist agents can help with medical questions, appointments, medications, rehabilitation and more. You can also attach a photo — like a rash, wound, or medication label — for the Clinical agent to review. What can I do for you?`,
    agents: ["orchestrator"],
    suggestions: [
      "What does my medication do?",
      "Book a checkup for next Monday at 10am",
      "I have knee pain after physiotherapy",
      "Show my recovery progress",
      "Help me with breathing exercises",
    ],
  },
  caregiver: {
    welcome: (name) =>
      `Hi ${name}! I'm your Primary Carer companion. I know the care plan of the patient you're linked to (only what they've permitted), so ask me anything — what's normal, how to help day-to-day, what their medications do, or what to watch for.`,
    agents: [],
    suggestions: [
      "How is my patient doing overall?",
      "Is their recent pain normal?",
      "How can I help with their recovery today?",
      "What do their medications do?",
      "What warning signs should I watch for?",
    ],
  },
  provider: {
    welcome: (name) =>
      `Hello ${name}. I'm your clinical copilot — I can see your panel's adherence, risk scores, symptom trends, and open escalations. Ask me who needs attention, for a patient summary, or what to review before a visit.`,
    agents: [],
    suggestions: [
      "Who needs attention first today?",
      "Summarize Ahmed Ali's trajectory",
      "Why is my highest-risk patient flagged?",
      "What should I review before Sara's next visit?",
    ],
  },
};

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function timestamp() {
  return new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard unavailable */ }
  }
  return (
    <button className="msg-copy-btn" onClick={copy} title="Copy reply">
      {copied ? "Copied ✓" : "⧉ Copy"}
    </button>
  );
}

export default function Chat() {
  const { user } = useAuth();
  const { settings, speak } = useAccessibility();
  const roleChat = ROLE_CHAT[user?.role] || ROLE_CHAT.patient;
  const isPatient = (user?.role || "patient") === "patient";
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: roleChat.welcome(user?.name?.split(" ")[0] || "there"),
      agents: roleChat.agents,
      time: timestamp(),
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [pendingImage, setPendingImage] = useState(null); // { file, previewUrl }
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  // Object URLs stay alive while the chat is mounted (sent-message bubbles
  // keep using them); revoke everything only on unmount.
  const objectUrlsRef = useRef([]);

  const voice = useVoice({ onResult: (t) => setInput(t) });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current = [];
    };
  }, []);

  function discardUrl(url) {
    URL.revokeObjectURL(url);
    objectUrlsRef.current = objectUrlsRef.current.filter((u) => u !== url);
  }

  function onPickImage(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessages((m) => [...m, { role: "bot", text: "⚠️ Please choose an image file (JPEG, PNG, or WebP).", agents: [], time: timestamp() }]);
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setMessages((m) => [...m, { role: "bot", text: "⚠️ That image is too large (max 8MB).", agents: [], time: timestamp() }]);
      return;
    }
    // Replacing an unsent image? Its URL is safe to free immediately.
    if (pendingImage) discardUrl(pendingImage.previewUrl);
    const previewUrl = URL.createObjectURL(file);
    objectUrlsRef.current.push(previewUrl);
    setPendingImage({ file, previewUrl });
  }

  function removePendingImage() {
    if (pendingImage) discardUrl(pendingImage.previewUrl);
    setPendingImage(null);
  }

  async function send(text) {
    if (pendingImage) {
      await sendImage();
      return;
    }
    const msg = (text ?? input).trim();
    if (!msg || sending) return;

    setMessages((m) => [...m, { role: "user", text: msg, time: timestamp() }]);
    setInput("");
    setSending(true);
    try {
      let res;
      if (isPatient) {
        res = await api.chat(user.id, msg);
      } else {
        // Role assistants keep thread context via the last few turns
        // (skip the canned welcome message).
        const history = messages
          .slice(1)
          .slice(-6)
          .map((m) => ({ role: m.role === "user" ? "user" : "assistant", text: m.text || "" }));
        res = await api.assistantChat({ user_id: user.id, role: user.role, message: msg, history });
      }
      const botMsg = { role: "bot", text: res.reply, agents: res.agents_used, emergency: res.emergency, time: timestamp() };
      setMessages((m) => [...m, botMsg]);
      if (settings.voiceEnabled || settings.screenReader) speak(res.reply);
    } catch (err) {
      setMessages((m) => [...m, { role: "bot", text: `⚠️ ${err.message}`, agents: [], time: timestamp() }]);
    } finally {
      setSending(false);
    }
  }

  async function sendImage() {
    if (!pendingImage || sending) return;
    if (user?.role !== "patient") {
      setMessages((m) => [...m, { role: "bot", text: "Image analysis is available for patient accounts.", agents: [], time: timestamp() }]);
      setPendingImage(null);
      return;
    }

    const caption = input.trim();
    const { file, previewUrl } = pendingImage;
    setMessages((m) => [...m, { role: "user", text: caption, image: previewUrl, time: timestamp() }]);
    setInput("");
    setPendingImage(null);
    setSending(true);
    setAnalyzingImage(true);
    try {
      const res = await api.chatWithImage(user.id, file, caption);
      const botMsg = { role: "bot", text: res.reply, agents: res.agents_used, emergency: res.emergency, time: timestamp() };
      setMessages((m) => [...m, botMsg]);
      if (settings.voiceEnabled || settings.screenReader) speak(res.reply);
    } catch (err) {
      setMessages((m) => [...m, { role: "bot", text: `⚠️ ${err.message}`, agents: [], time: timestamp() }]);
    } finally {
      setSending(false);
      setAnalyzingImage(false);
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
        {roleChat.suggestions.map((s) => (
          <button key={s} onClick={() => send(s)} disabled={sending}>{s}</button>
        ))}
      </div>

      <div className="chat-scroll" ref={scrollRef}>
        {messages.map((m, i) => (
          <motion.div
            key={i}
            className={`msg ${m.role}${m.emergency ? " emergency" : ""}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            {m.image && <img src={m.image} alt="Attached" className="chat-msg-image" />}
            {m.text && (m.role === "bot" ? <Markdown text={m.text} /> : <div>{m.text}</div>)}
            {m.role === "bot" && m.agents?.length > 0 && (
              <div className="mt" style={{ marginTop: 10 }}>
                <AgentStatusBoard phase="done" activeAgents={m.agents} />
              </div>
            )}
            <div className="msg-footer">
              <span className="msg-time">{m.time}</span>
              {m.role === "bot" && m.text && <CopyButton text={m.text} />}
            </div>
          </motion.div>
        ))}
        {sending && (
          <motion.div className="msg bot" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="typing-indicator">
              <span /><span /><span />
              <span style={{ marginLeft: 8 }}>{analyzingImage ? "Analyzing your photo…" : "Sanadi is thinking…"}</span>
            </div>
            {isPatient && (
              <div style={{ marginTop: 10 }}>
                <AgentStatusBoard phase="thinking" />
              </div>
            )}
          </motion.div>
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
        <input type="file" accept="image/*" ref={fileInputRef} style={{ display: "none" }} onChange={onPickImage} />
        {isPatient && (
          <button
            className="mic-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Attach a photo for the Clinical agent to review"
            aria-label="Attach photo"
          >
            📷
          </button>
        )}
        {voice.supported && (
          <button
            className={`mic-btn${voice.listening ? " listening" : ""}`}
            onClick={() => (voice.listening ? voice.stop() : voice.start())}
            title="Speak"
            aria-label="Voice input"
          >
            {voice.listening ? "⏹️" : "🎤"}
            {voice.listening && <span className="mic-pulse-ring" />}
          </button>
        )}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={voice.listening ? "Listening…" : pendingImage ? "Add a caption (optional)…" : "Type your message…"}
        />
        <motion.button
          className="btn"
          onClick={() => send()}
          disabled={sending || (!input.trim() && !pendingImage)}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
        >
          {sending ? "…" : pendingImage ? "Send photo" : "Send"} ➤
        </motion.button>
      </div>
    </div>
  );
}
