export default function ProgressBar({ percentage = 0, height = 4 }) {
  return (
    <div
      style={{
        height: `${height}px`,
        borderRadius: `${height / 2}px`,
        background: "var(--border)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          borderRadius: `${height / 2}px`,
          width: `${Math.min(percentage, 100)}%`,
          background: "linear-gradient(90deg, var(--accent), var(--green))",
          transition: "width 1s ease",
        }}
      />
    </div>
  );
}
