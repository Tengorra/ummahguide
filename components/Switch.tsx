"use client";

export default function Switch({
  checked,
  onChange,
  label,
  dark = false,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  dark?: boolean;
}) {
  const on = checked ? (dark ? "bg-gold-500" : "bg-em-900") : dark ? "bg-white/15" : "bg-ink/15";
  const knob = checked ? (dark ? "bg-night" : "bg-ivory") : dark ? "bg-ivory" : "bg-white";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-[26px] w-11 shrink-0 rounded-full transition-colors ${on}`}
    >
      <span
        className={`absolute top-[3px] h-5 w-5 rounded-full transition-[left] ${knob}`}
        style={{ left: checked ? 21 : 3 }}
      />
    </button>
  );
}
