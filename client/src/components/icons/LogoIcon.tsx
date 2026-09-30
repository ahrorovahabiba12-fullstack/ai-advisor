// The app's brand mark: an upward growth trend with a highlighted point —
// stands in for lucide-react's Sparkles wherever the "AI Advisor" identity
// icon appears (sidebars, auth pages, chat header). One source of truth so a
// future logo change is a single edit instead of one per call site.
export function LogoIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 17 9 11 13 14 21 5" />
      <circle cx="21" cy="5" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}
