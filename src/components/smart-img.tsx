import type { ImgHTMLAttributes } from "react";
import { webpSrc } from "@/lib/image";
import { cn } from "@/lib/utils";

type Props = ImgHTMLAttributes<HTMLImageElement> & {
  src: string;
  priority?: boolean;
};

export function SmartImg({
  src,
  alt = "",
  className,
  priority,
  loading,
  decoding,
  fetchPriority,
  ...rest
}: Props) {
  const webp = webpSrc(src);
  const eager = Boolean(priority);
  return (
    <img
      src={webp || src}
      alt={alt}
      className={cn("bg-surface-2", className)}
      loading={loading ?? (eager ? "eager" : "lazy")}
      decoding={decoding ?? "async"}
      fetchPriority={fetchPriority ?? (eager ? "high" : "low")}
      {...rest}
    />
  );
}
