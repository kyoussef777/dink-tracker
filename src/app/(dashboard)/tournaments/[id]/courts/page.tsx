import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { getCurrentRole } from "@/lib/auth"
import { ChevronLeft, Tv } from "lucide-react"
import { db } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { EmptyState } from "@/components/shared/EmptyState"
import { LiveIndicator } from "@/components/shared/LiveIndicator"
import { LiveSubscriber } from "@/components/shared/LiveSubscriber"
import { CourtCard } from "@/components/match/CourtCard"

export default async function CourtsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const current = await getCurrentRole()
  if (!current) redirect("/sign-in")
  if (current.role !== "ADMIN") redirect(`/tournaments/${id}`)

  const tournament = await db.tournament.findFirst({
    where: { id },
    select: { id: true, name: true, courtNames: true },
  })
  if (!tournament) notFound()

  const matches = await db.match.findMany({
    where: {
      bracket: { tournamentId: id },
      court: { not: null },
      status: { in: ["IN_PROGRESS", "PENDING"] },
    },
    include: {
      team1: { include: { players: { select: { name: true } } } },
      team2: { include: { players: { select: { name: true } } } },
      bracket: { select: { id: true, skillLevel: true } },
    },
    orderBy: [{ status: "desc" }, { round: "asc" }, { position: "asc" }],
  })

  const matchesByCourt = new Map<string, typeof matches>()
  for (const m of matches) {
    if (!m.court) continue
    const arr = matchesByCourt.get(m.court) ?? []
    arr.push(m)
    matchesByCourt.set(m.court, arr)
  }

  const configured = tournament.courtNames
  const stragglers = [...matchesByCourt.keys()].filter((c) => !configured.includes(c))
  const allCourts = [...configured, ...stragglers]
  const liveCount = matches.filter((m) => m.status === "IN_PROGRESS").length

  return (
    <div className="space-y-8">
      <LiveSubscriber tournamentId={id} />

      <div>
        <Link
          href={`/tournaments/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          {tournament.name}
        </Link>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Courts</h1>
          <p className="text-sm text-muted-foreground">
            {configured.length} configured · {liveCount} live now
          </p>
        </div>
        <div className="flex items-center gap-3">
          {liveCount > 0 && <LiveIndicator label={`${liveCount} live`} />}
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href={`/share/${id}/courts`} target="_blank" rel="noopener noreferrer">
              <Tv className="h-4 w-4" />
              Big screen
            </Link>
          </Button>
        </div>
      </div>

      <Separator />

      {allCourts.length === 0 ? (
        <EmptyState
          title="No courts configured"
          description="Edit the tournament and add court names so you can assign matches."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {allCourts.map((courtName) => {
            const courtMatches = matchesByCourt.get(courtName) ?? []
            const live = courtMatches.find((m) => m.status === "IN_PROGRESS") ?? null
            const queued = courtMatches.filter((m) => m.id !== live?.id)
            return (
              <CourtCard
                key={courtName}
                courtName={courtName}
                tournamentId={id}
                live={live}
                queued={queued}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

export const dynamic = "force-dynamic"
