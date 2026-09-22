import { cn } from "@/lib/utils";

/** Compact smile mark — tab bar, onboarding. */
export function WippMark({
  size = 56,
  className,
  invert,
}: {
  size?: number;
  className?: string;
  invert?: boolean;
}) {
  const face = invert ? "#0B1220" : "#F7F9FC";
  const smile = invert ? "#0B1220" : "#FFD84D";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden
    >
      <rect width="64" height="64" rx="32" fill={invert ? "#FFD84D" : "#0B1220"} />
      <circle cx="22" cy="27" r="4.4" fill={face} />
      <circle cx="42" cy="27" r="4.4" fill={face} />
      <path
        d="M18 36c4.8 9.5 23.2 9.5 28 0"
        stroke={smile}
        strokeWidth="3.6"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

/**
 * Header wordmark: rounded “wipp” + yellow i-dot + smile.
 * Height follows font-size (1em).
 */
export function WippWordmark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 172 58"
      className={cn("h-[1em] w-[2.96em]", className)}
      aria-label="Wipp"
      role="img"
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="10.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M13 14c0 0-1 24 12.5 24 10.5 0 13-16.5 16.5-16.5S48 38 58.5 38C73 38 72 14 72 14" />
        <path d="M88 23.5v18" />
        <path d="M108 12v38" />
        <path d="M108 16.5c18.5 0 23 4.5 23 12.5s-4.5 12.5-23 12.5" />
        <path d="M142 12v38" />
        <path d="M142 16.5c18.5 0 23 4.5 23 12.5s-4.5 12.5-23 12.5" />
      </g>
      <circle cx="88" cy="12" r="5.8" className="fill-accent" />
      <path
        d="M20 52c32 8 98 8 132 0"
        className="stroke-accent"
        strokeWidth="5.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function WgoMark(props: { size?: number; className?: string; invert?: boolean }) {
  return <WippMark {...props} />;
}

export function WgoWordmark(props: { className?: string }) {
  return <WippWordmark {...props} />;
}
