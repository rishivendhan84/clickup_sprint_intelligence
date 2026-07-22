/**
 * Loading skeleton. Renders n placeholder blocks with a shimmer animation.
 * Use in place of content cards while API calls are in-flight.
 */

export default function LoadingSkeleton({ count = 4, height = 120 }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(count, 4)}, 1fr)`, gap: "16px" }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{
            height: `${height}px`,
            borderRadius: "var(--radius-lg)",
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
}
