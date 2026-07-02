// Compact month calendar — highlights real appointment dates.
export default function MiniCalendar({ highlightDates = [] }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const highlightSet = new Set(highlightDates.map((d) => new Date(d).toDateString()));

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="mini-calendar">
      <div className="mini-cal-head">{now.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</div>
      <div className="mini-cal-grid">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="mini-cal-dow">{d}</div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const dateStr = new Date(year, month, d).toDateString();
          const isToday = dateStr === now.toDateString();
          const hasAppt = highlightSet.has(dateStr);
          return (
            <div key={i} className={"mini-cal-day" + (isToday ? " today" : "") + (hasAppt ? " has-appt" : "")}>
              {d}
            </div>
          );
        })}
      </div>
    </div>
  );
}
