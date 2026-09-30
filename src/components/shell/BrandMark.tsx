/** "Setu" means bridge: an arch spanning ploughed furrows. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <path d="M3 21c3.5-9 22.5-9 26 0" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M9 17.5v7M16 15.5v9M23 17.5v7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".55" />
      <path d="M3 27.5h26" stroke="var(--color-leaf)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
