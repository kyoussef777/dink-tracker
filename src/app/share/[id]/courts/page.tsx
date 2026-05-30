import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { db } from "@/lib/db"
import { LiveSubscriber } from "@/components/shared/LiveSubscriber"
import { LiveIndicator } from "@/components/shared/LiveIndicator"
import { EmptyState } from "@/components/shared/EmptyState"

export default async function PublicCourtsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const tournament = await db.tournament.findUnique({
    where: { id },
    select: { id: true, name: true, venue: true, courtNames: true },
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
      bracket: { select: { skillLevel: true } },
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

  const stragglers = [...matchesByCourt.keys()].filter((c) => !tournament.courtNames.includes(c))
  const allCourts = [...tournament.courtNames, ...stragglers]
  const liveCount = matches.filter((m) => m.status === "IN_PROGRESS").length

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <LiveSubscriber tournamentId={id} />

      <header className="flex items-center justify-between gap-4 border-b px-6 py-5 sm:px-10">
        <div className="min-w-0">
          <h1 className="truncate text-3xl font-bold tracking-tight sm:text-4xl">{tournament.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            {tournament.venue ? `${tournament.venue} · ` : ""}Court status
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-4">
          {liveCount > 0 && <LiveIndicator className="text-sm sm:text-base" label={`${liveCount} live`} />}
          <Link
            href={`/share/${id}`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            Tournament
          </Link>
        </div>
      </header>

      <main className="flex-1 p-6 sm:p-10">
        {allCourts.length === 0 ? (
          <EmptyState
            title="No courts configured"
            description="Court assignments will appear here once the organizer sets them up."
          />
        ) : (
          <div className="grid auto-rows-fr gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {allCourts.map((courtName) => {
              const courtMatches = matchesByCourt.get(courtName) ?? []
              const live = courtMatches.find((m) => m.status === "IN_PROGRESS") ?? null
              const next = courtMatches.find((m) => m.id !== live?.id) ?? null
              return <CourtPanel key={courtName} courtName={courtName} live={live} next={next} />
            })}
          </div>
        )}
      </main>
    </div>
  )
}

type CourtMatch = {
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "BYE"
  score1: number[]
  score2: number[]
  bracket: { skillLevel: string }
  team1: { name: string; players: { name: string }[] } | null
  team2: { name: string; players: { name: string }[] } | null
}

function CourtPanel({
  courtName,
  live,
  next,
}: {
  courtName: string
  live: CourtMatch | null
  next: CourtMatch | null
}) {
  const active = live ?? next
  return (
    <div
      className={
        "flex flex-col rounded-2xl border bg-card p-6 shadow-sm " +
        (live ? "border-accent ring-1 ring-accent/40" : "")
      }
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{courtName}</h2>
        {live ? (
          <LiveIndicator className="text-sm" />
        ) : (
          <span className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            {next ? "Up next" : "Open"}
          </span>
        )}
      </div>

      {active ? (
        <div className="mt-5 flex-1 space-y-4">
          <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            {active.bracket.skillLevel}
          </p>
          <TeamRow team={active.team1} score={live ? active.score1 : null} />
          <div className="text-sm font-medium uppercase tracking-widest text-muted-foreground">vs</div>
          <TeamRow team={active.team2} score={live ? active.score2 : null} />
        </div>
      ) : (
        <p className="mt-5 flex-1 text-lg text-muted-foreground">No match assigned</p>
      )}
    </div>
  )
}

function TeamRow({
  team,
  score,
}: {
  team: { name: string; players: { name: string }[] } | null
  score: number[] | null
}) {
  if (!team) {
    return <p className="text-xl font-semibold text-muted-foreground sm:text-2xl">TBD</p>
  }
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="truncate text-xl font-bold leading-tight sm:text-2xl">{team.name}</p>
        <p className="mt-0.5 truncate text-sm text-muted-foreground sm:text-base">
          {team.players.map((p) => p.name).join(" / ")}
        </p>
      </div>
      {score && score.length > 0 && (
        <div className="flex flex-shrink-0 gap-2 tabular-nums">
          {score.map((g, i) => (
            <span key={i} className="text-2xl font-bold sm:text-3xl">
              {g}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export const dynamic = "force-dynamic"
