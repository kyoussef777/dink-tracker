import { Trophy } from "lucide-react"
import { BracketTree } from "@/components/bracket/BracketTree"
import { EditableMatchCard } from "@/components/match/EditableMatchCard"
import { MatchCard } from "@/components/bracket/MatchCard"
import type { Match, Team } from "@prisma/client"

type MatchWithTeams = Match & { team1: Team | null; team2: Team | null; winner: Team | null }

interface Props {
  matches: MatchWithTeams[]
  courtOptions: string[]
  readOnly?: boolean
  highlightTeamIds?: string[]
}

export function DoubleEliminationView({ matches, courtOptions, readOnly, highlightTeamIds }: Props) {
  const winners = matches.filter((m) => m.bracketSide === "WINNERS")
  const losers = matches.filter((m) => m.bracketSide === "LOSERS")
  const grandFinal = matches.filter((m) => m.bracketSide === "GRAND_FINAL")

  const winnersTotalRounds = maxRound(winners) - minRound(winners) + 1
  const losersTotalRounds = maxRound(losers) - minRound(losers) + 1

  const winnersNormalized = renumberFromOne(winners)
  const losersNormalized = renumberFromOne(losers)

  return (
    <div className="space-y-10">
      <Section
        title="Winners Bracket"
        subtitle="Standard knockout — winners advance, losers drop to the losers bracket."
      >
        <BracketTree
          matches={winnersNormalized}
          totalRounds={winnersTotalRounds}
          courtOptions={courtOptions}
          readOnly={readOnly}
          highlightTeamIds={highlightTeamIds}
        />
      </Section>

      {losers.length > 0 && (
        <Section
          title="Losers Bracket"
          subtitle="Every team gets a second chance. Lose here and you're out."
        >
          <BracketTree
            matches={losersNormalized}
            totalRounds={losersTotalRounds}
            courtOptions={courtOptions}
            readOnly={readOnly}
            highlightTeamIds={highlightTeamIds}
            roundLabel={losersRoundLabel}
          />
        </Section>
      )}

      {grandFinal.length > 0 && (
        <Section title="Grand Final" subtitle="Winners-bracket champion vs Losers-bracket champion.">
          <div className="flex justify-center">
            <div className="w-full max-w-sm">
              {grandFinal.map((m) =>
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
        </Section>
      )}
    </div>
  )
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-start gap-2">
        {title === "Grand Final" && <Trophy className="mt-0.5 h-4 w-4 text-amber-500" />}
        <div>
          <h3 className="text-base font-semibold tracking-tight">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

function minRound(matches: MatchWithTeams[]): number {
  return matches.reduce((m, x) => Math.min(m, x.round), Infinity)
}

function maxRound(matches: MatchWithTeams[]): number {
  return matches.reduce((m, x) => Math.max(m, x.round), -Infinity)
}

/** Re-base round numbers so the section's first round is 1. BracketTree expects 1-based rounds. */
function renumberFromOne(matches: MatchWithTeams[]): MatchWithTeams[] {
  if (matches.length === 0) return []
  const base = minRound(matches) - 1
  return matches.map((m) => ({ ...m, round: m.round - base }))
}

function losersRoundLabel(round: number, totalRounds: number): string {
  if (round === totalRounds) return "Losers Final"
  return `Losers R${round}`
}
