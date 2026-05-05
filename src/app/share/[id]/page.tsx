import { notFound } from "next/navigation"
import Link from "next/link"
import { Calendar, MapPin, Trophy, Users } from "lucide-react"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { EmptyState } from "@/components/shared/EmptyState"
import { LiveSubscriber } from "@/components/shared/LiveSubscriber"
import { Logo } from "@/components/shared/Logo"
import { ThemeToggle } from "@/components/shared/ThemeToggle"
import { formatDateRange, bracketFormatLabel } from "@/lib/utils"
import type { TournamentStatus, BracketStatus } from "@prisma/client"

export default async function PublicTournamentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const tournament = await db.tournament.findUnique({
    where: { id },
    include: {
      brackets: {
        include: {
          teams: { select: { id: true } },
          matches: { select: { id: true, status: true } },
        },
        orderBy: { skillLevel: "asc" },
      },
    },
  })

  if (!tournament) notFound()

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between gap-3">
          <Link href="/">
            <Logo size={26} />
          </Link>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] uppercase">
              Public view
            </Badge>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="container py-8">
        <div className="space-y-8">
          <LiveSubscriber tournamentId={tournament.id} />

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{tournament.name}</h1>
              <StatusBadge kind="tournament" status={tournament.status as TournamentStatus} />
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {formatDateRange(tournament.startDate, tournament.endDate)}
              </span>
              {tournament.venue && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {tournament.venue}
                </span>
              )}
            </div>
            {tournament.description && (
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {tournament.description}
              </p>
            )}
          </div>

          <Separator />

          <section className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">Brackets</h2>
            {tournament.brackets.length === 0 ? (
              <EmptyState
                title="No brackets yet"
                description="The organizer hasn't set up any brackets for this tournament."
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {tournament.brackets.map((b) => {
                  const matchCount = b.matches.length
                  const completed = b.matches.filter((m) => m.status === "COMPLETED").length
                  const progress = matchCount > 0 ? Math.round((completed / matchCount) * 100) : 0
                  return (
                    <Link
                      key={b.id}
                      href={`/share/${tournament.id}/${b.id}`}
                      className="group block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <Card className="h-full transition-all hover:border-primary/50 hover:shadow-md">
                        <CardHeader className="pb-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1">
                              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                Skill level
                              </p>
                              <h3 className="text-2xl font-bold tracking-tight transition-colors group-hover:text-primary">
                                {b.skillLevel}
                              </h3>
                            </div>
                            <StatusBadge kind="bracket" status={b.status as BracketStatus} />
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3 pb-5 text-sm">
                          <p className="text-muted-foreground">{bracketFormatLabel(b.format)}</p>
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5">
                              <Users className="h-4 w-4" />
                              {b.teams.length} {b.teams.length === 1 ? "team" : "teams"}
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <Trophy className="h-4 w-4" />
                              {completed}/{matchCount}
                            </span>
                          </div>
                          {matchCount > 0 && (
                            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full bg-primary transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

export const dynamic = "force-dynamic"
