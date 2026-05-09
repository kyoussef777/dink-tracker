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
  roundLabel?: (round: number, totalRounds: number) => string
}

export function BracketTree({ matches, totalRounds, courtOptions, readOnly, highlightTeamIds, roundLabel: roundLabelFn }: Props) {
  const matchesByRound = new Map<number, MatchWithTeams[]>()
  for (const m of matches) {
    const arr = matchesByRound.get(m.round) ?? []
    arr.push(m)
    matchesByRound.set(m.round, arr)
  }

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
      <div className="flex min-w-max items-stretch gap-6 sm:gap-8">
        {Array.from({ length: totalRounds }, (_, i) => i + 1).map((round) => {
          const roundMatches = (matchesByRound.get(round) ?? []).sort((a, b) => a.position - b.position)
          return (
            <div key={round} className="flex w-60 shrink-0 flex-col sm:w-64">
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {(roundLabelFn ?? roundLabel)(round, totalRounds)}
              </h4>
              <div
                className="flex flex-1 flex-col"
                style={{
                  justifyContent: round === 1 ? "flex-start" : "space-around",
                  gap: round === 1 ? "0.75rem" : `${Math.pow(2, round - 1) * 0.75}rem`,
                }}
              >
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
            </div>
          )
        })}
      </div>
    </div>
  )
}

function roundLabel(round: number, totalRounds: number): string {
  const fromEnd = totalRounds - round
  if (fromEnd === 0) return "Final"
  if (fromEnd === 1) return "Semifinal"
  if (fromEnd === 2) return "Quarterfinal"
  return `Round ${round}`
}
