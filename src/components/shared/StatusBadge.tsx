import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { TournamentStatus, BracketStatus, MatchStatus } from "@prisma/client"

const tournamentStyles: Record<TournamentStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground hover:bg-muted",
  REGISTRATION: "bg-blue-100 text-blue-900 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-200",
  ACTIVE: "bg-primary/15 text-primary hover:bg-primary/15 border-primary/30",
  COMPLETED: "bg-secondary/15 text-secondary hover:bg-secondary/15 border-secondary/30",
  CANCELLED: "bg-destructive/15 text-destructive hover:bg-destructive/15",
}

const bracketStyles: Record<BracketStatus, string> = {
  PENDING: "bg-muted text-muted-foreground hover:bg-muted",
  ACTIVE: "bg-primary/15 text-primary hover:bg-primary/15 border-primary/30",
  COMPLETED: "bg-secondary/15 text-secondary hover:bg-secondary/15 border-secondary/30",
}

const matchStyles: Record<MatchStatus, string> = {
  PENDING: "bg-muted text-muted-foreground hover:bg-muted",
  IN_PROGRESS: "bg-accent/30 text-accent-foreground hover:bg-accent/30 border-accent",
  COMPLETED: "bg-primary/15 text-primary hover:bg-primary/15",
  BYE: "bg-muted/50 text-muted-foreground hover:bg-muted/50 italic",
}

const labels: Record<string, string> = {
  DRAFT: "Draft",
  REGISTRATION: "Registration",
  ACTIVE: "Active",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  PENDING: "Pending",
  IN_PROGRESS: "Live",
  BYE: "Bye",
}

type Props =
  | { kind: "tournament"; status: TournamentStatus; className?: string }
  | { kind: "bracket"; status: BracketStatus; className?: string }
  | { kind: "match"; status: MatchStatus; className?: string }

export function StatusBadge(props: Props) {
  const styleMap =
    props.kind === "tournament" ? tournamentStyles : props.kind === "bracket" ? bracketStyles : matchStyles
  const style = styleMap[props.status as keyof typeof styleMap]
  return (
    <Badge variant="outline" className={cn("font-medium uppercase tracking-wide text-[10px]", style, props.className)}>
      {labels[props.status] ?? props.status}
    </Badge>
  )
}
