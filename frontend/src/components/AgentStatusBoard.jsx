import { motion } from "framer-motion";

const AGENTS = [
  { key: "orchestrator", icon: "🧠", label: "Orchestrator" },
  { key: "clinical", icon: "👨‍⚕️", label: "Clinical" },
  { key: "engagement", icon: "❤️", label: "Engagement" },
  { key: "operations", icon: "📅", label: "Operations" },
  { key: "safety", icon: "🛡️", label: "Safety" },
  { key: "analytics", icon: "📊", label: "Analytics" },
  { key: "accessibility", icon: "♿", label: "Accessibility" },
  { key: "rehabilitation", icon: "🥽", label: "Rehab" },
];

// phase: "idle" | "thinking" | "done"
// activeAgents: agent keys actually used in the response (only known once done)
export default function AgentStatusBoard({ phase = "idle", activeAgents = [] }) {
  return (
    <div className="agent-board">
      {AGENTS.map((a) => {
        const isDone = phase === "done" && activeAgents.includes(a.key);
        const isThinking = phase === "thinking" && a.key === "orchestrator";
        return (
          <motion.div
            key={a.key}
            className={"agent-chip" + (isDone ? " done" : "") + (isThinking ? " thinking" : "")}
            animate={isThinking ? { scale: [1, 1.08, 1] } : { scale: 1 }}
            transition={isThinking ? { duration: 1.1, repeat: Infinity, ease: "easeInOut" } : {}}
          >
            <span className="agent-chip-icon">{a.icon}</span>
            <span className="agent-chip-label">{a.label}</span>
            {isDone && (
              <motion.span
                className="agent-chip-check"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 20 }}
              >
                ✓
              </motion.span>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
