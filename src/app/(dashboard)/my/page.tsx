import Link from "next/link"
import { redirect } from "next/navigation"
import { currentUser } from "@clerk/nextjs/server"
import { ArrowRight, Calendar, MapPin, Trophy, Users } from "lucide-react"
import { db } from "@/lib/db"
import { getCurrentRole } from "@/lib/auth"
import { autoLinkPlayersByEmail } from "@/lib/player-link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { EmptyState } from "@/components/shared/EmptyState"
import { LiveSubscriber } from "@/components/shared/LiveSubscriber"
import { LiveIndicator } from "@/components/shared/LiveIndicator"
import { formatDateRange } from "@/lib/utils"

export default async function MyPage() {
  const current = await getCurrentRole()
  if (!current) redirect("/sign-in")

  const user = await currentUser()
  await autoLinkPlayersByEmail(current.userId, user?.primaryEmailAddress?.emailAddress ?? null)

  const teams = await db.team.findMany({
    where: { players: { some: { userId: current.userId } } },
    include: {
      players: { select: { id: true, name: true, userId: true } },
      bracket: {
        include: {
          tournament: { select: { id: true, name: true, venue: true, startDate: true, endDate: true } },
          matches: {
            include: {
              team1: { select: { id: true, name: true } },
              team2: { select: { id: true, name: true } },
            },
            orderBy: [{ round: "asc" }, { position: "asc" }],
          },
        },
      },
    },
  })

  if (teams.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">My matches</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            You&apos;ll see your tournaments here once an organizer adds you to a team.
          </p>
        </div>
        <EmptyState
          title="Not on a team yet"
          description={`Ask the tournament organizer to add ${user?.primaryEmailAddress?.emailAddress ?? "your email"} to a team. Your matches will appear here automatically.`}
        />
      </div>
    )
  }

  const tournamentIds = Array.from(new Set(teams.map((t) => t.bracket.tournament.id)))

  return (
    <div className="space-y-8">
      {tournamentIds.map((id) => (
        <LiveSubscriber key={id} tournamentId={id} />
      ))}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">My matches</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {teams.length} {teams.length === 1 ? "team" : "teams"} across{" "}
          {tournamentIds.length} {tournamentIds.length === 1 ? "tournament" : "tournaments"}
        </p>
      </div>

      <Separator />

      <div className="space-y-6">
        {teams.map((team) => {
          const t = team.bracket.tournament
          const myMatches = team.bracket.matches.filter(
            (m) => m.team1Id === team.id || m.team2Id === team.id
          )
          const live = myMatches.find((m) => m.status === "IN_PROGRESS") ?? null
          const next = myMatches.find((m) => m.status === "PENDING" && m.team1Id && m.team2Id) ?? null
          const wins = myMatches.filter((m) => m.winnerId === team.id).length
          const losses = myMatches.filter(
            (m) => m.status === "COMPLETED" && m.winnerId && m.winnerId !== team.id
          ).length

          const opponentOf = (m: { team1Id: string | null; team2Id: string | null; team1: { name: string } | null; team2: { name: string } | null }) => {
            if (m.team1Id === team.id) return m.team2?.name ?? "TBD"
            if (m.team2Id === team.id) return m.team1?.name ?? "TBD"
            return "TBD"
          }

          return (
            <Card key={team.id}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {t.name} · {team.bracket.skillLevel}
                    </p>
                    <CardTitle className="text-xl">{team.name}</CardTitle>
                    <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      {team.players.map((p) => p.name).join(" / ")}
                    </p>
                  </div>
                  {live && <LiveIndicator label="On court" />}
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDateRange(t.startDate, t.endDate)}
                  </span>
                  {t.venue && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {t.venue}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5">
                    <Trophy className="h-3.5 w-3.5" />
                    {wins}–{losses}
                  </span>
                </div>

                {live && (
                  <div className="rounded-md border border-accent/60 bg-accent/5 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium uppercase tracking-wider text-accent-foreground">
                        Now playing
                      </span>
                      {live.court && <Badge variant="secondary">Court {live.court}</Badge>}
                    </div>
                    <p className="mt-1 text-sm font-medium">vs {opponentOf(live)}</p>
                  </div>
                )}

                {!live && next && (
                  <div className="rounded-md border bg-muted/30 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Up next
                      </span>
                      {next.court && <Badge variant="secondary">Court {next.court}</Badge>}
                    </div>
                    <p className="mt-1 text-sm font-medium">vs {opponentOf(next)}</p>
                  </div>
                )}

                {!live && !next && (
                  <p className="text-xs text-muted-foreground">No upcoming match — check the bracket for details.</p>
                )}

                <div className="flex justify-end">
                  <Link
                    href={`/tournaments/${t.id}/brackets/${team.bracket.id}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    View bracket
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export const dynamic = "force-dynamic"
