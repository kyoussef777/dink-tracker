import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Users } from "lucide-react"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { EmptyState } from "@/components/shared/EmptyState"
import { BracketTree } from "@/components/bracket/BracketTree"
import { RoundRobinView } from "@/components/bracket/RoundRobinView"
import { StandingsTable } from "@/components/bracket/StandingsTable"
import { ChampionCard } from "@/components/bracket/ChampionCard"
import { LiveSubscriber } from "@/components/shared/LiveSubscriber"
import { computeStandings } from "@/lib/standings"
import { bracketFormatLabel } from "@/lib/utils"
import type { BracketStatus } from "@prisma/client"

export default async function PublicBracketPage({
  params,
}: {
  params: Promise<{ id: string; bracketId: string }>
}) {
  const { id: tournamentId, bracketId } = await params

  const bracket = await db.bracket.findFirst({
    where: { id: bracketId, tournamentId },
    include: {
      tournament: { select: { id: true, name: true, courtNames: true } },
      teams: { include: { players: true }, orderBy: { seed: "asc" } },
      matches: {
        include: { team1: true, team2: true, winner: true },
        orderBy: [{ round: "asc" }, { position: "asc" }],
      },
    },
  })

  if (!bracket) notFound()

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container flex h-14 items-center justify-between">
          <Link href={`/share/${tournamentId}`} className="flex items-center gap-2 font-bold tracking-tight">
            <span className="inline-block h-6 w-6 rounded-md bg-primary" aria-hidden="true" />
            <span>Dink Tracker</span>
          </Link>
          <Badge variant="outline" className="text-[10px] uppercase">
            Public view
          </Badge>
        </div>
      </header>
      <main className="container py-8">
        <div className="space-y-8">
          <LiveSubscriber tournamentId={tournamentId} />

          <div>
            <Link
              href={`/share/${tournamentId}`}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              {bracket.tournament.name}
            </Link>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Skill level</p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{bracket.skillLevel}</h1>
              <StatusBadge kind="bracket" status={bracket.status as BracketStatus} />
            </div>
            <p className="text-sm text-muted-foreground">{bracketFormatLabel(bracket.format)}</p>
          </div>

          <Separator />

          {bracket.teams.length === 0 ? (
            <EmptyState title="No teams added yet" description="Check back when the organizer enters teams." />
          ) : (
            <>
              {(() => {
                if (bracket.status !== "COMPLETED" || bracket.format === "ROUND_ROBIN") return null
                const final = bracket.matches.find(
                  (m) => m.round === bracket.rounds && m.status === "COMPLETED"
                )
                if (!final?.winnerId) return null
                const team = bracket.teams.find((t) => t.id === final.winnerId)
                return team ? <ChampionCard team={team} /> : null
              })()}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold tracking-tight">Bracket</h2>
                  <span className="text-sm text-muted-foreground">
                    {bracket.teams.length} teams · {bracket.matches.length} matches
                  </span>
                </div>
                {bracket.matches.length === 0 ? (
                  <EmptyState title="No matches yet" description="Matches will appear once the bracket starts." />
                ) : bracket.format === "ROUND_ROBIN" ? (
                  <RoundRobinView
                    matches={bracket.matches}
                    totalRounds={bracket.rounds}
                    courtOptions={bracket.tournament.courtNames}
                    readOnly
                  />
                ) : (
                  <BracketTree
                    matches={bracket.matches}
                    totalRounds={bracket.rounds}
                    courtOptions={bracket.tournament.courtNames}
                    readOnly
                  />
                )}
              </section>

              {bracket.format === "ROUND_ROBIN" && (
                <section className="space-y-4">
                  <h2 className="text-xl font-semibold tracking-tight">Standings</h2>
                  <StandingsTable rows={computeStandings(bracket.teams, bracket.matches)} />
                </section>
              )}

              <section className="space-y-4">
                <h2 className="text-xl font-semibold tracking-tight">Teams</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {bracket.teams.map((team) => (
                    <Card key={team.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-base">{team.name}</CardTitle>
                          {team.seed != null && (
                            <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                              Seed {team.seed}
                            </span>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-1.5 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" />
                          {team.players.map((p) => p.name).join(" / ")}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export const dynamic = "force-dynamic"
