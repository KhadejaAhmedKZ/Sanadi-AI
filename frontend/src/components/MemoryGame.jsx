import { useState } from "react";

const ICONS = ["💊", "🩺", "❤️", "🧠", "🦴", "🩹"];

function shuffledDeck() {
  const deck = [...ICONS, ...ICONS]
    .map((icon, i) => ({ uid: `${icon}-${i}-${Math.random()}`, icon, matched: false }))
    .sort(() => Math.random() - 0.5);
  return deck;
}

// A real memory-matching card game — used by the Memory Care module.
export default function MemoryGame() {
  const [cards, setCards] = useState(shuffledDeck);
  const [flipped, setFlipped] = useState([]); // indices currently face-up (max 2)
  const [moves, setMoves] = useState(0);
  const [locked, setLocked] = useState(false);

  function reset() {
    setCards(shuffledDeck());
    setFlipped([]);
    setMoves(0);
    setLocked(false);
  }

  function flip(idx) {
    if (locked || flipped.includes(idx) || cards[idx].matched) return;
    const next = [...flipped, idx];
    setFlipped(next);
    if (next.length === 2) {
      setMoves((m) => m + 1);
      setLocked(true);
      const [a, b] = next;
      if (cards[a].icon === cards[b].icon) {
        setTimeout(() => {
          setCards((cs) => cs.map((c, i) => (i === a || i === b ? { ...c, matched: true } : c)));
          setFlipped([]);
          setLocked(false);
        }, 450);
      } else {
        setTimeout(() => {
          setFlipped([]);
          setLocked(false);
        }, 850);
      }
    }
  }

  const allMatched = cards.every((c) => c.matched);

  return (
    <div className="care-tool-panel">
      <div className="row between mb">
        <span className="muted" style={{ fontSize: ".85rem" }}>Moves: {moves}</span>
        <button className="btn ghost sm" onClick={reset}>🔄 Restart</button>
      </div>

      {allMatched ? (
        <div className="center" style={{ padding: 24 }}>
          <div style={{ fontSize: "2.2rem" }}>🎉</div>
          <div style={{ fontWeight: 700, marginTop: 6 }}>Completed in {moves} moves!</div>
          <button className="btn sm mt" onClick={reset}>Play again</button>
        </div>
      ) : (
        <div className="memory-grid">
          {cards.map((c, idx) => {
            const isUp = flipped.includes(idx) || c.matched;
            return (
              <button
                key={c.uid}
                className={"memory-card" + (isUp ? " up" : "") + (c.matched ? " matched" : "")}
                onClick={() => flip(idx)}
                disabled={isUp}
                aria-label={isUp ? c.icon : "Hidden card"}
              >
                <span>{isUp ? c.icon : "❔"}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
