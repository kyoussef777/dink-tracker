import { EditableMatchCard } from "@/components/match/EditableMatchCard"
import { MatchCard } from "@/components/bracket/MatchCard"
import type { Match, Team } from "@prisma/client"

type MatchWithTeams = Match & { team1: Team | null; team2: Team | null; winner: Team | null }

interface Props {
  matches: MatchWithTeams[]
  totalRounds: number
  courtOptions: string[]
  readOnly?: boolean
  highlightTeamIds?: string[]
}

export function RoundRobinView({
  matches,
  totalRounds,
  courtOptions,
  readOnly,
  highlightTeamIds,
}: Props) {
  const byRound = new Map<number, MatchWithTeams[]>()
  for (const m of matches) {
    const arr = byRound.get(m.round) ?? []
    arr.push(m)
    byRound.set(m.round, arr)
  }

  return (
    <div className="space-y-6">
      {Array.from({ length: totalRounds }, (_, i) => i + 1).map((round) => {
        const roundMatches = (byRound.get(round) ?? []).sort((a, b) => a.position - b.position)
        if (roundMatches.length === 0) return null
        const completed = roundMatches.filter((m) => m.status === "COMPLETED").length
        return (
          <section key={round} className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Round {round}
              </h3>
              <span className="text-xs text-muted-foreground tabular-nums">
                {completed}/{roundMatches.length}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {roundMatches.map((m) =>
                readOnly ? (
                  <MatchCard key={m.id} match={m} highlightTeamIds={highlightTeamIds} />
                ) : (
                  <EditableMatchCard
                    key={m.id}
                    match={m}
                    courtOptions={courtOptions}
                    highlightTeamIds={highlightTeamIds}
                  />
                )
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}
