/** Section divider drawn as ploughed furrows with a few seedlings. */
export function FurrowDivider({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1200 28" preserveAspectRatio="none" className={className ?? "my-14 block h-7 w-full"} aria-hidden>
      {[8, 15, 22].map((y, i) => (
        <path
          key={y}
          d={`M0 ${y} Q300 ${y - 4} 600 ${y} T1200 ${y}`}
          stroke="var(--color-soil)"
          strokeOpacity={0.18 + i * 0.08}
          strokeWidth="1.5"
          fill="none"
        />
      ))}
      {Array.from({ length: 24 }, (_, i) => (
        <path
          key={i}
          d={`M${25 + i * 50} 15 q-3 -6 -6 -7 M${25 + i * 50} 15 q3 -6 6 -8`}
          stroke="var(--color-leaf)"
          strokeOpacity="0.55"
          strokeWidth="1.4"
          fill="none"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}
