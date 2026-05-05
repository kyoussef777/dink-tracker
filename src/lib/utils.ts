import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date))
}

export function formatDateRange(start: Date | string, end?: Date | string | null) {
  const s = formatDate(start)
  if (!end) return s
  return `${s} – ${formatDate(end)}`
}

const BRACKET_FORMAT_LABELS: Record<string, string> = {
  SINGLE_ELIMINATION: "Single elimination",
  DOUBLE_ELIMINATION: "Double elimination",
  ROUND_ROBIN: "Round robin",
  POOL_PLAY: "Pool play",
}

export function bracketFormatLabel(format: string): string {
  return BRACKET_FORMAT_LABELS[format] ?? format
}
