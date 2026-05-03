import { cn } from "@/lib/utils"

export function LiveIndicator({ className, label = "Live" }: { className?: string; label?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-accent-foreground",
        className
      )}
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
      </span>
      {label}
    </span>
  )
}
