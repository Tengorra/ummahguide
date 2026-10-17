/** Subtle 8-point star geometry, used only as a low-opacity texture. */
export default function Pattern({
  id,
  opacity = 0.12,
  size = 56,
  color = "#C9A44C",
  className = "",
}: {
  id: string;
  opacity?: number;
  size?: number;
  color?: string;
  className?: string;
}) {
  const q = size / 4;
  const half = size / 2;
  return (
    <svg
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      style={{ opacity }}
    >
      <defs>
        <pattern id={id} width={size} height={size} patternUnits="userSpaceOnUse">
          <g fill="none" stroke={color} strokeWidth="1">
            <rect x={q} y={q} width={half} height={half} />
            <rect x={q} y={q} width={half} height={half} transform={`rotate(45 ${half} ${half})`} />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}
