import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function NotFound() {
  return (
    <div className="notfound-wrap">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="notfound-icon"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        >
          🩺
        </motion.div>
        <h1>404</h1>
        <p>This page took a wrong turn at the hospital hallway.</p>
        <Link to="/" className="btn gradient lg mt">← Back to Home</Link>
      </motion.div>
    </div>
  );
}
