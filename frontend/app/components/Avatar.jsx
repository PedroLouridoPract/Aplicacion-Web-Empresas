const COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#ef4444", // red
  "#f97316", // orange
  "#22c55e", // green
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#a855f7", // purple
  "#e11d48", // rose
  "#0891b2", // cyan-dark
];

function getColorForName(name) {
  const str = (name || "?").trim();
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

const SIZES = {
  xs: "h-8 w-8 text-xs",
  sm: "h-9 w-9 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
  xl: "h-28 w-28 text-4xl",
};

export default function Avatar({ name, src, size = "md", className = "" }) {
  const initial = (name || "?").charAt(0).toUpperCase();
  const bg = getColorForName(name);

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`rounded-full object-cover ${SIZES[size]} ${className}`}
      />
    );
  }

  return (
    <span
      className={`flex items-center justify-center rounded-full font-bold text-white ${SIZES[size]} ${className}`}
      style={{ backgroundColor: bg }}
    >
      {initial}
    </span>
  );
}

export { getColorForName };
