import { useEffect, useRef, useState } from "react";
import { animate } from "framer-motion";

// Counts up from 0 to `value` whenever it changes. Non-numeric values render as-is.
export default function AnimatedCounter({ value, decimals = 0, suffix = "", prefix = "" }) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);
  const numeric = typeof value === "number" && !Number.isNaN(value);

  useEffect(() => {
    if (!numeric) return;
    const controls = animate(prevRef.current, value, {
      duration: 0.8,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(v),
    });
    prevRef.current = value;
    return () => controls.stop();
  }, [value, numeric]);

  if (!numeric) return <>{value}</>;

  return (
    <>{prefix}{display.toFixed(decimals)}{suffix}</>
  );
}
