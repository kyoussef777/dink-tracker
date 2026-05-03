import { notFound } from "next/navigation"
import Link from "next/link"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { ChevronLeft, Users } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { EmptyState } from "@/components/shared/EmptyState"
import { BracketTree } from "@/components/bracket/BracketTree"
import { AddTeamsForm } from "@/components/bracket/AddTeamsForm"
import { BracketActions } from "@/components/bracket/BracketActions"
import type { BracketStatus } from "@prisma/client"

const formatLabel: Record<string, string> = {
  SINGLE_ELIMINATION: "Single elimination",
  DOUBLE_ELIMINATION: "Double elimination",
  ROUND_ROBIN: "Round robin",
  POOL_PLAY: "Pool play",
}

export default async function BracketDetailPage({
  params,
}: {
  params: Promise<{ id: string; bracketId: string }>
}) {
  const { id: tournamentId, bracketId } = await params
  const { userId } = await auth()
  if (!userId) notFound()

  const bracket = await db.bracket.findFirst({
    where: { id: bracketId, tournament: { createdBy: userId, id: tournamentId } },
    include: {
      tournament: { select: { id: true, name: true } },
      teams: { include: { players: true }, orderBy: { seed: "asc" } },
      matches: {
        include: { team1: true, team2: true, winner: true },
        orderBy: [{ round: "asc" }, { position: "asc" }],
      },
    },
  })

  if (!bracket) notFound()

  const hasTeams = bracket.teams.length > 0

  return (
    <div className="space-y-8">
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
            <h1 className="text-3xl font-bold tracking-tight">{bracket.skillLevel}</h1>
            <StatusBadge kind="bracket" status={bracket.status as BracketStatus} />
          </div>
          <p className="text-sm text-muted-foreground">{formatLabel[bracket.format] ?? bracket.format}</p>
        </div>
        <BracketActions bracketId={bracket.id} tournamentId={tournamentId} />
      </div>

      <Separator />

      {!hasTeams ? (
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
        <>
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold tracking-tight">Bracket</h2>
              <span className="text-sm text-muted-foreground">
                {bracket.teams.length} teams · {bracket.matches.length} matches
              </span>
            </div>
            {bracket.matches.length === 0 ? (
              <EmptyState title="No matches generated" description="Try recreating this bracket." />
            ) : (
              <BracketTree matches={bracket.matches} totalRounds={bracket.rounds} />
            )}
          </section>

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
  )
}

export const dynamic = "force-dynamic"
