import { EditableMatchCard } from "@/components/match/EditableMatchCard"
import type { Match, Team } from "@prisma/client"

type MatchWithTeams = Match & { team1: Team | null; team2: Team | null; winner: Team | null }

interface Props {
  matches: MatchWithTeams[]
  totalRounds: number
  courtOptions: string[]
}

export function BracketTree({ matches, totalRounds, courtOptions }: Props) {
  const matchesByRound = new Map<number, MatchWithTeams[]>()
  for (const m of matches) {
    const arr = matchesByRound.get(m.round) ?? []
    arr.push(m)
    matchesByRound.set(m.round, arr)
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex min-w-max items-stretch gap-8">
        {Array.from({ length: totalRounds }, (_, i) => i + 1).map((round) => {
          const roundMatches = (matchesByRound.get(round) ?? []).sort((a, b) => a.position - b.position)
          return (
            <div key={round} className="flex w-64 shrink-0 flex-col">
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {roundLabel(round, totalRounds)}
              </h4>
              <div
                className="flex flex-1 flex-col"
                style={{
                  justifyContent: round === 1 ? "flex-start" : "space-around",
                  gap: round === 1 ? "0.75rem" : `${Math.pow(2, round - 1) * 0.75}rem`,
                }}
              >
                {roundMatches.map((m) => (
                  <EditableMatchCard key={m.id} match={m} courtOptions={courtOptions} />
                ))}
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
