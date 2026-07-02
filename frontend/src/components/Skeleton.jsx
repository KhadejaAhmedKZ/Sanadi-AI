// Shimmer loading placeholders — replace spinners on data-heavy pages.
export function Skeleton({ w = "100%", h = 16, radius = 8, style }) {
  return <div className="skeleton" style={{ width: w, height: h, borderRadius: radius, ...style }} />;
}

export function SkeletonCard() {
  return (
    <div className="card">
      <Skeleton w={40} h={40} radius={12} style={{ marginBottom: 14 }} />
      <Skeleton w="60%" h={22} style={{ marginBottom: 8 }} />
      <Skeleton w="40%" h={14} />
    </div>
  );
}

export function SkeletonStatGrid({ count = 4 }) {
  return (
    <div className="grid cols-4">
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}

export function SkeletonList({ rows = 4, bare = false }) {
  const body = (
    <>
      {!bare && <Skeleton w="30%" h={18} style={{ marginBottom: 18 }} />}
      {Array.from({ length: rows }).map((_, i) => (
        <div className="row" key={i} style={{ padding: "12px 0", gap: 14 }}>
          <Skeleton w={40} h={40} radius={11} />
          <div style={{ flex: 1 }}>
            <Skeleton w="70%" h={14} style={{ marginBottom: 8 }} />
            <Skeleton w="40%" h={12} />
          </div>
        </div>
      ))}
    </>
  );
  return bare ? body : <div className="card">{body}</div>;
}
