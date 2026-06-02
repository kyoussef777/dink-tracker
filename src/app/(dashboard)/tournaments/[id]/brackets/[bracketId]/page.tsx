import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/db"
import { getCurrentRole } from "@/lib/auth"
import { ChevronLeft, Users } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { EmptyState } from "@/components/shared/EmptyState"
import { BracketTree } from "@/components/bracket/BracketTree"
import { DoubleEliminationView } from "@/components/bracket/DoubleEliminationView"
import { RoundRobinView } from "@/components/bracket/RoundRobinView"
import { StandingsTable } from "@/components/bracket/StandingsTable"
import { ChampionCard } from "@/components/bracket/ChampionCard"
import { AddTeamsForm } from "@/components/bracket/AddTeamsForm"
import { BracketActions } from "@/components/bracket/BracketActions"
import { EditTeamButton } from "@/components/bracket/TeamManageDialog"
import { LiveSubscriber } from "@/components/shared/LiveSubscriber"
import { computeStandings } from "@/lib/standings"
import { bracketFormatLabel } from "@/lib/utils"
import type { BracketStatus } from "@prisma/client"

export default async function BracketDetailPage({
  params,
}: {
  params: Promise<{ id: string; bracketId: string }>
}) {
  const { id: tournamentId, bracketId } = await params
  const current = await getCurrentRole()
  if (!current) redirect("/sign-in")

  const isAdmin = current.role === "ADMIN"
  const where = isAdmin
    ? { id: bracketId, tournament: { createdBy: current.userId, id: tournamentId } }
    : {
        id: bracketId,
        tournament: { id: tournamentId },
        teams: { some: { players: { some: { userId: current.userId } } } },
      }

  const bracket = await db.bracket.findFirst({
    where,
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

  const hasTeams = bracket.teams.length > 0
  const courtOptions = bracket.tournament.courtNames
  const myTeamIds = bracket.teams
    .filter((t) => t.players.some((p) => p.userId === current.userId))
    .map((t) => t.id)
  const champion = computeChampion(bracket)
  // Admins can move any team in the bracket into a match slot.
  const teamOptions = isAdmin ? bracket.teams.map((t) => ({ id: t.id, name: t.name })) : undefined

  return (
    <div className="space-y-8">
      <LiveSubscriber tournamentId={tournamentId} />
      <div>
        <Link
          href={`/tournaments/${tournamentId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          {bracket.tournament.name}
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Skill level</p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{bracket.skillLevel}</h1>
            <StatusBadge kind="bracket" status={bracket.status as BracketStatus} />
            {!isAdmin && myTeamIds.length > 0 && (
              <Badge variant="outline" className="border-primary/40 text-primary">
                Read-only
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{bracketFormatLabel(bracket.format)}</p>
        </div>
        {isAdmin && <BracketActions bracketId={bracket.id} tournamentId={tournamentId} hasTeams={hasTeams} />}
      </div>

      <Separator />

      {!hasTeams ? (
        isAdmin ? (
          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Add teams</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter at least 2 teams. We&apos;ll generate the bracket automatically based on the format you chose.
              </p>
            </div>
            <AddTeamsForm bracketId={bracket.id} />
          </section>
        ) : (
          <EmptyState
            title="No teams added yet"
            description="The organizer hasn't entered teams for this bracket yet. Check back soon."
          />
        )
      ) : (
        <>
          {champion && <ChampionCard team={champion} highlightTeamIds={myTeamIds} />}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold tracking-tight">Bracket</h2>
              <span className="text-sm text-muted-foreground">
                {bracket.teams.length} teams · {bracket.matches.length} matches
              </span>
            </div>
            {bracket.matches.length === 0 ? (
              <EmptyState title="No matches generated" description="Try recreating this bracket." />
            ) : bracket.format === "ROUND_ROBIN" ? (
              <RoundRobinView
                matches={bracket.matches}
                totalRounds={bracket.rounds}
                courtOptions={courtOptions}
                readOnly={!isAdmin}
                highlightTeamIds={myTeamIds}
                teamOptions={teamOptions}
              />
            ) : bracket.format === "DOUBLE_ELIMINATION" ? (
              <DoubleEliminationView
                matches={bracket.matches}
                courtOptions={courtOptions}
                readOnly={!isAdmin}
                highlightTeamIds={myTeamIds}
                teamOptions={teamOptions}
              />
            ) : (
              <BracketTree
                matches={bracket.matches}
                totalRounds={bracket.rounds}
                courtOptions={courtOptions}
                readOnly={!isAdmin}
                highlightTeamIds={myTeamIds}
                teamOptions={teamOptions}
              />
            )}
          </section>

          {bracket.format === "ROUND_ROBIN" && (
            <section className="space-y-4">
              <h2 className="text-xl font-semibold tracking-tight">Standings</h2>
              <StandingsTable
                rows={computeStandings(bracket.teams, bracket.matches)}
                highlightTeamIds={myTeamIds}
              />
            </section>
          )}

          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-semibold tracking-tight">Teams</h2>
              {isAdmin && (
                <p className="text-xs text-muted-foreground">
                  Tip: edit a team, then regenerate the bracket to rebuild the draw.
                </p>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {bracket.teams.map((team) => {
                const mine = myTeamIds.includes(team.id)
                return (
                  <Card key={team.id} className={mine ? "border-primary/40" : undefined}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="min-w-0 truncate text-base">
                          {team.name}
                          {mine && (
                            <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-primary">
                              You
                            </span>
                          )}
                        </CardTitle>
                        <div className="flex shrink-0 items-center gap-1">
                          {team.seed != null && (
                            <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                              Seed {team.seed}
                            </span>
                          )}
                          {isAdmin && (
                            <EditTeamButton
                              bracketId={bracket.id}
                              team={{
                                id: team.id,
                                name: team.name,
                                seed: team.seed,
                                players: team.players.map((p) => ({
                                  name: p.name,
                                  email: p.email,
                                  phone: p.phone,
                                  rating: p.rating,
                                })),
                              }}
                            />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-1.5 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{team.players.map((p) => p.name).join(" / ")}</span>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function computeChampion<
  T extends { id: string },
  M extends { round: number; winnerId: string | null; status: string }
>(bracket: { status: string; format: string; rounds: number; teams: T[]; matches: M[] }): T | null {
  if (bracket.status !== "COMPLETED") return null
  if (bracket.format === "ROUND_ROBIN") return null
  const final = bracket.matches.find((m) => m.round === bracket.rounds && m.status === "COMPLETED")
  if (!final?.winnerId) return null
  return bracket.teams.find((t) => t.id === final.winnerId) ?? null
}

export const dynamic = "force-dynamic"
