import Link from "next/link"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { Trophy, Users } from "lucide-react"
import type { Bracket, BracketStatus } from "@prisma/client"

interface Props {
  bracket: Bracket
  tournamentId: string
  teamCount: number
  matchCount: number
  completedMatches: number
}

const formatLabel: Record<string, string> = {
  SINGLE_ELIMINATION: "Single elimination",
  DOUBLE_ELIMINATION: "Double elimination",
  ROUND_ROBIN: "Round robin",
  POOL_PLAY: "Pool play",
}

export function BracketSummaryCard({ bracket, tournamentId, teamCount, matchCount, completedMatches }: Props) {
  const progress = matchCount > 0 ? Math.round((completedMatches / matchCount) * 100) : 0

  return (
    <Link
      href={`/tournaments/${tournamentId}/brackets/${bracket.id}`}
      className="group block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Card className="h-full transition-all hover:border-primary/50 hover:shadow-md">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Skill level</p>
              <h3 className="text-2xl font-bold tracking-tight group-hover:text-primary transition-colors">
                {bracket.skillLevel}
              </h3>
            </div>
            <StatusBadge kind="bracket" status={bracket.status as BracketStatus} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pb-5 text-sm">
          <p className="text-muted-foreground">{formatLabel[bracket.format] ?? bracket.format}</p>
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              {teamCount} {teamCount === 1 ? "team" : "teams"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Trophy className="h-4 w-4" />
              {completedMatches}/{matchCount}
            </span>
          </div>
          {matchCount > 0 && (
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
                aria-label={`${progress}% complete`}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
