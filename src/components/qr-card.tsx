import { qrGrid } from "@/lib/qr";
import { cn } from "@/lib/utils";

export function QrCard({
  value,
  size = 220,
  className,
  markSrc,
  pad = 12,
}: {
  value: string;
  size?: number;
  className?: string;
  markSrc?: string;
  pad?: number;
}) {
  const grid = qrGrid(value);
  const n = grid.length;
  const qPad = 3;
  const dim = n + qPad * 2;
  const inner = Math.max(48, size - pad * 2);
  const mark = Math.round(inner * 0.22);

  return (
    <div
      className={cn("relative overflow-hidden rounded-xl bg-paper", className)}
      style={{ width: size, height: size, padding: pad }}
    >
      <svg width={inner} height={inner} viewBox={`0 0 ${dim} ${dim}`} className="block">
        <rect width={dim} height={dim} fill="#F7F9FC" />
        {grid.map((row, r) =>
          row.map((on, c) =>
            on ? (
              <rect
                key={`${r}-${c}`}
                x={c + qPad}
                y={r + qPad}
                width={1}
                height={1}
                rx={0.15}
                fill={
                  (r < 7 && c < 7) || (r < 7 && c > n - 8) || (r > n - 8 && c < 7)
                    ? "#0B1220"
                    : r % 7 === 3 && c % 7 === 3
                      ? "#C9A227"
                      : "#0B1220"
                }
              />
            ) : null,
          ),
        )}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        {markSrc ? (
          <img
            src={markSrc}
            alt=""
            className="rounded-lg object-cover outline outline-3 outline-paper"
            style={{ width: mark, height: mark }}
          />
        ) : (
          <div
            className="flex items-center justify-center rounded-lg bg-navy shadow-[0_0_0_3px_#F7F9FC]"
            style={{ width: mark, height: mark }}
          >
            <svg width={mark * 0.55} height={mark * 0.55} viewBox="0 0 64 64" aria-hidden>
              <circle cx="20" cy="32" r="6" fill="#F7F9FC" />
              <circle cx="44" cy="32" r="6" fill="#FFD84D" />
              <path
                d="M20 32c2.4 0 3.6 8 12 8s9.6-8 12-8"
                stroke="#F7F9FC"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          </div>
        )}
      </div>
      <span className="sr-only">{value}</span>
    </div>
  );
}
