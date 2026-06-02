import { EditableMatchCard } from "@/components/match/EditableMatchCard"
import { MatchCard } from "@/components/bracket/MatchCard"
import type { TeamOption } from "@/components/match/MatchEditDialog"
import type { Match, Team } from "@prisma/client"

type MatchWithTeams = Match & { team1: Team | null; team2: Team | null; winner: Team | null }

interface Props {
  matches: MatchWithTeams[]
  totalRounds: number
  courtOptions: string[]
  readOnly?: boolean
  highlightTeamIds?: string[]
  teamOptions?: TeamOption[]
  roundLabel?: (round: number, totalRounds: number) => string
}

export function BracketTree({ matches, totalRounds, courtOptions, readOnly, highlightTeamIds, teamOptions, roundLabel: roundLabelFn }: Props) {
  const matchesByRound = new Map<number, MatchWithTeams[]>()
  for (const m of matches) {
    const arr = matchesByRound.get(m.round) ?? []
    arr.push(m)
    matchesByRound.set(m.round, arr)
  }

  // A round-1 that's smaller than round-2 is a play-in (overflow) round.
  const hasPlayIn = (matchesByRound.get(1)?.length ?? 0) < (matchesByRound.get(2)?.length ?? 0)
  const labelFor = roundLabelFn ?? ((round: number, total: number) => roundLabel(round, total, hasPlayIn))

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
      <div className="flex min-w-max items-stretch gap-4 sm:gap-8">
        {Array.from({ length: totalRounds }, (_, i) => i + 1).map((round) => {
          const roundMatches = (matchesByRound.get(round) ?? []).sort((a, b) => a.position - b.position)
          return (
            <div key={round} className="flex w-52 shrink-0 flex-col sm:w-64">
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {labelFor(round, totalRounds)}
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
                      teamOptions={teamOptions}
                      totalRounds={totalRounds}
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

function roundLabel(round: number, totalRounds: number, hasPlayIn = false): string {
  if (hasPlayIn && round === 1) return "Play-In"
  const fromEnd = totalRounds - round
  if (fromEnd === 0) return "Final"
  if (fromEnd === 1) return "Semifinal"
  if (fromEnd === 2) return "Quarterfinal"
  // Round-of-N label for earlier rounds (accounts for the extra play-in round).
  const teamsThisRound = Math.pow(2, fromEnd + 1)
  if (hasPlayIn) return `Round of ${teamsThisRound}`
  return `Round ${round}`
}
