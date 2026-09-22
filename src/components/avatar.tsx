import { webpSrc } from "@/lib/image";
import { cn } from "@/lib/utils";
import type { User } from "@/lib/types";

export function Avatar({
  user,
  size = 44,
  ring,
  className,
  hidden,
  priority,
}: {
  user?: Pick<User, "displayName" | "avatar" | "online"> | null;
  size?: number;
  ring?: "accent" | "muted" | "none";
  className?: string;
  hidden?: boolean;
  priority?: boolean;
}) {
  const initials = (user?.displayName ?? "?")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <span
      className={cn("relative inline-flex shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <span
        className={cn(
          "overflow-hidden rounded-full bg-surface-2 text-muted",
          ring === "accent" && "ring-2 ring-accent ring-offset-2 ring-offset-bg",
          ring === "muted" && "ring-2 ring-hair ring-offset-2 ring-offset-bg",
        )}
        style={{ width: size, height: size }}
      >
        {hidden ? (
          <span className="flex size-full items-center justify-center bg-navy">
            <svg width={size * 0.42} height={size * 0.42} viewBox="0 0 64 64" aria-hidden>
              <circle cx="20" cy="32" r="7" fill="#F7F9FC" />
              <circle cx="44" cy="32" r="7" fill="#FFD84D" />
              <path
                d="M20 32c2.4 0 3.6 8 12 8s9.6-8 12-8"
                stroke="#F7F9FC"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          </span>
        ) : user?.avatar ? (
          <img
            src={webpSrc(user.avatar)}
            alt=""
            width={size}
            height={size}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={priority ? "high" : "low"}
            className="size-full object-cover outline outline-1 -outline-offset-1 outline-black/20"
          />
        ) : (
          <span
            className="flex size-full items-center justify-center bg-navy text-paper"
            style={{ fontSize: size * 0.34 }}
          >
            {initials}
          </span>
        )}
      </span>
      {!hidden && user?.online ? (
        <span
          className="absolute right-0 bottom-0 rounded-full bg-accent outline-2 outline-bg"
          style={{ width: Math.max(8, size * 0.22), height: Math.max(8, size * 0.22) }}
        />
      ) : null}
    </span>
  );
}

export function GroupAvatar({
  users,
  size = 44,
  photo,
  priority,
}: {
  users: Array<Pick<User, "displayName" | "avatar" | "online"> | undefined>;
  size?: number;
  photo?: string;
  priority?: boolean;
}) {
  if (photo) {
    return (
      <span
        className="relative inline-flex shrink-0 overflow-hidden rounded-full bg-surface-2"
        style={{ width: size, height: size }}
      >
        <img
          src={webpSrc(photo)}
          alt=""
          width={size}
          height={size}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className="size-full object-cover outline outline-1 -outline-offset-1 outline-black/20"
        />
      </span>
    );
  }
  const a = users[0];
  const b = users[1];
  const inner = Math.round(size * 0.68);
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <span className="absolute top-0 right-0">
        <Avatar user={b} size={inner} priority={priority} />
      </span>
      <span className="absolute bottom-0 left-0">
        <Avatar user={a} size={inner} priority={priority} />
      </span>
    </span>
  );
}
