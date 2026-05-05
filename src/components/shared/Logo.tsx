import { cn } from "@/lib/utils"

interface Props {
  className?: string
  size?: number
  withWordmark?: boolean
}

export function Logo({ className, size = 24, withWordmark = true }: Props) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <PickleballMark size={size} />
      {withWordmark && (
        <span className="font-bold tracking-tight text-foreground">Dink Tracker</span>
      )}
    </span>
  )
}

export function PickleballMark({ size = 24 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      aria-hidden="true"
      className="shrink-0"
    >
      <defs>
        <linearGradient id="dt-paddle" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--pickle-light, 88 65% 60%))" />
          <stop offset="100%" stopColor="hsl(var(--primary))" />
        </linearGradient>
        <radialGradient id="dt-ball" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#fff3a8" />
          <stop offset="100%" stopColor="hsl(var(--accent))" />
        </radialGradient>
      </defs>
      <g transform="rotate(-22 16 16)">
        <rect x="7.5" y="3" width="14" height="18" rx="6" fill="url(#dt-paddle)" />
        <rect x="7.5" y="3" width="14" height="18" rx="6" fill="none" stroke="hsl(var(--pickle-dark, 100 50% 28%))" strokeOpacity="0.45" strokeWidth="0.8" />
        <rect x="12.5" y="20" width="4" height="9" rx="1.6" fill="hsl(var(--pickle-dark, 100 50% 28%))" />
        <rect x="11.5" y="19" width="6" height="3" rx="1" fill="hsl(var(--pickle-dark, 100 50% 28%))" opacity="0.85" />
      </g>
      <circle cx="24" cy="8.5" r="4.5" fill="url(#dt-ball)" />
      <circle cx="24" cy="8.5" r="4.5" fill="none" stroke="#000" strokeOpacity="0.12" strokeWidth="0.6" />
      <circle cx="22.5" cy="7.5" r="0.55" fill="#000" fillOpacity="0.35" />
      <circle cx="25.5" cy="9.5" r="0.55" fill="#000" fillOpacity="0.35" />
      <circle cx="22.8" cy="10" r="0.55" fill="#000" fillOpacity="0.35" />
    </svg>
  )
}
