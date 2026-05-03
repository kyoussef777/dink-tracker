import { cn } from "@/lib/utils"
import type { Match, Team, MatchStatus } from "@prisma/client"

interface Props {
  match: Match & { team1: Team | null; team2: Team | null; winner: Team | null }
  className?: string
}

function lastGameScore(scores: number[]) {
  return scores.length > 0 ? scores[scores.length - 1] : null
}

function totalGamesWon(s1: number[], s2: number[]) {
  let team1Wins = 0
  let team2Wins = 0
  for (let i = 0; i < Math.max(s1.length, s2.length); i++) {
    const a = s1[i] ?? 0
    const b = s2[i] ?? 0
    if (a > b) team1Wins++
    else if (b > a) team2Wins++
  }
  return [team1Wins, team2Wins] as const
}

export function MatchCard({ match, className }: Props) {
  const isBye = match.status === "BYE"
  const isCompleted = match.status === "COMPLETED"
  const isLive = match.status === "IN_PROGRESS"

  const [t1Wins, t2Wins] = isCompleted || isLive ? totalGamesWon(match.score1, match.score2) : [0, 0]
  const team1Won = match.winnerId === match.team1Id
  const team2Won = match.winnerId === match.team2Id

  return (
    <div
      className={cn(
        "rounded-lg border bg-card text-sm shadow-sm overflow-hidden",
        isLive && "border-accent ring-1 ring-accent/40",
        isBye && "opacity-60",
        className
      )}
    >
      <TeamRow
        name={match.team1?.name ?? (isBye ? "—" : "TBD")}
        score={isCompleted || isLive ? lastGameScore(match.score1) : null}
        gamesWon={isCompleted || isLive ? t1Wins : null}
        winner={team1Won}
        ghost={!match.team1}
      />
      <div className="h-px bg-border" />
      <TeamRow
        name={match.team2?.name ?? (isBye ? "—" : "TBD")}
        score={isCompleted || isLive ? lastGameScore(match.score2) : null}
        gamesWon={isCompleted || isLive ? t2Wins : null}
        winner={team2Won}
        ghost={!match.team2}
      />
      {(match.court || isLive) && (
        <div className="flex items-center justify-between border-t bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
          {match.court ? <span>Court {match.court}</span> : <span />}
          {isLive && (
            <span className="inline-flex items-center gap-1.5 font-medium text-accent-foreground">
              <span className="h-1.5 w-1.5 animate-pulse-live rounded-full bg-accent" />
              Live
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function TeamRow({
  name,
  score,
  gamesWon,
  winner,
  ghost,
}: {
  name: string
  score: number | null
  gamesWon: number | null
  winner: boolean
  ghost: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 px-3 py-2",
        winner && "bg-primary/5",
        ghost && "text-muted-foreground"
      )}
    >
      <span className={cn("truncate font-medium", winner && "text-primary")}>{name}</span>
      <div className="flex items-center gap-2 tabular-nums">
        {gamesWon !== null && <span className="text-xs text-muted-foreground">{gamesWon}</span>}
        {score !== null && <span className={cn("font-semibold", winner && "text-primary")}>{score}</span>}
      </div>
    </div>
  )
}

export const matchCardStatusClasses: Record<MatchStatus, string> = {
  PENDING: "",
  IN_PROGRESS: "border-accent",
  COMPLETED: "",
  BYE: "opacity-60",
}
