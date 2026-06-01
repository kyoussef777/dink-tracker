import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/db"
import { getCurrentRole } from "@/lib/auth"
import { Calendar, MapPin, ChevronLeft, LayoutGrid } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LiveSubscriber } from "@/components/shared/LiveSubscriber"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { EmptyState } from "@/components/shared/EmptyState"
import { Separator } from "@/components/ui/separator"
import { TournamentActions } from "@/components/tournament/TournamentActions"
import { ShareButton } from "@/components/tournament/ShareButton"
import { NotifyPlayersDialog } from "@/components/tournament/NotifyPlayersDialog"
import { RegistrationsCsvImport } from "@/components/tournament/RegistrationsCsvImport"
import { CreateBracketDialog } from "@/components/bracket/CreateBracketDialog"
import { BracketSummaryCard } from "@/components/bracket/BracketSummaryCard"
import { BracketSkillFilter } from "@/components/bracket/BracketSkillFilter"
import { formatDateRange } from "@/lib/utils"
import type { TournamentStatus } from "@prisma/client"

type SearchParams = { skill?: string }

export default async function TournamentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<SearchParams>
}) {
  const { id } = await params
  const sp = await searchParams
  const current = await getCurrentRole()
  if (!current) redirect("/sign-in")

  const where =
    current.role === "ADMIN"
      ? { id, createdBy: current.userId }
      : {
          id,
          brackets: { some: { teams: { some: { players: { some: { userId: current.userId } } } } } },
        }

  const tournament = await db.tournament.findFirst({
    where,
    include: {
      brackets: {
        include: {
          teams: { select: { id: true, players: { select: { userId: true } } } },
          matches: { select: { id: true, status: true } },
        },
        orderBy: { skillLevel: "asc" },
      },
    },
  })

  if (!tournament) notFound()

  const isAdmin = current.role === "ADMIN"
  const skills = Array.from(new Set(tournament.brackets.map((b) => b.skillLevel))).sort()
  const skillFilter = sp.skill && skills.includes(sp.skill) ? sp.skill : null
  const visibleBrackets = skillFilter
    ? tournament.brackets.filter((b) => b.skillLevel === skillFilter)
    : tournament.brackets

  return (
    <div className="space-y-8">
      <LiveSubscriber tournamentId={tournament.id} />
      <div>
        <Link
          href={isAdmin ? "/tournaments" : "/my"}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          {isAdmin ? "All tournaments" : "My matches"}
        </Link>
      </div>

      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
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
            <p className="max-w-2xl text-sm text-muted-foreground leading-relaxed">{tournament.description}</p>
          )}
        </div>
        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <ShareButton tournamentId={tournament.id} />
            <NotifyPlayersDialog tournamentId={tournament.id} />
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link href={`/tournaments/${tournament.id}/courts`}>
                <LayoutGrid className="h-4 w-4" />
                Courts ({tournament.courtNames.length})
              </Link>
            </Button>
            <TournamentActions tournament={tournament} />
          </div>
        )}
      </div>

      <Separator />

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Brackets</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isAdmin
                ? "One bracket per skill level. Teams and matches are managed inside each bracket."
                : "Open a bracket to see the full tree and your next match."}
            </p>
          </div>
          {isAdmin && (
            <div className="flex flex-wrap items-center gap-2">
              <RegistrationsCsvImport tournamentId={tournament.id} />
              <CreateBracketDialog tournamentId={tournament.id} />
            </div>
          )}
        </div>

        {skills.length > 1 && (
          <BracketSkillFilter skills={skills} initial={skillFilter} />
        )}

        {visibleBrackets.length === 0 ? (
          tournament.brackets.length === 0 ? (
            <EmptyState
              title="No brackets yet"
              description={
                isAdmin
                  ? "Create a bracket for each skill level you'll be running. You can pick the format (single elimination, round robin, and more)."
                  : "The organizer hasn't set up any brackets yet."
              }
              action={isAdmin ? <CreateBracketDialog tournamentId={tournament.id} /> : undefined}
            />
          ) : (
            <EmptyState
              title="No brackets at this skill level"
              description="Try a different skill level or clear the filter."
            />
          )
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleBrackets.map((b) => (
              <BracketSummaryCard
                key={b.id}
                bracket={b}
                tournamentId={tournament.id}
                teamCount={b.teams.length}
                matchCount={b.matches.length}
                completedMatches={b.matches.filter((m) => m.status === "COMPLETED").length}
                youAreIn={b.teams.some((t) => t.players.some((p) => p.userId === current.userId))}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export const dynamic = "force-dynamic"
