import { useState } from "react";

// Generic sortable table. `columns`: [{ key, label, render?(row) }]
export default function Table({ columns, rows, rowKey = "id", onRowClick }) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState(1);

  function sortBy(key) {
    if (sortKey === key) { setSortDir((d) => -d); return; }
    setSortKey(key);
    setSortDir(1);
  }

  const sorted = sortKey
    ? [...rows].sort((a, b) => {
        const av = a[sortKey], bv = b[sortKey];
        if (typeof av === "number") return (av - bv) * sortDir;
        return String(av).localeCompare(String(bv)) * sortDir;
      })
    : rows;

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} onClick={() => c.sortable !== false && sortBy(c.key)} className={c.sortable !== false ? "sortable" : ""}>
                {c.label} {sortKey === c.key && (sortDir === 1 ? "↑" : "↓")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={row[rowKey]} onClick={() => onRowClick?.(row)} className={onRowClick ? "clickable" : ""}>
              {columns.map((c) => (
                <td key={c.key}>{c.render ? c.render(row) : row[c.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
