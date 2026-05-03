import { notFound } from "next/navigation"
import Link from "next/link"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { Calendar, MapPin, ChevronLeft } from "lucide-react"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { EmptyState } from "@/components/shared/EmptyState"
import { Separator } from "@/components/ui/separator"
import { TournamentActions } from "@/components/tournament/TournamentActions"
import { CreateBracketDialog } from "@/components/bracket/CreateBracketDialog"
import { BracketSummaryCard } from "@/components/bracket/BracketSummaryCard"
import { formatDateRange } from "@/lib/utils"
import type { TournamentStatus } from "@prisma/client"

export default async function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { userId } = await auth()
  if (!userId) notFound()

  const tournament = await db.tournament.findFirst({
    where: { id, createdBy: userId },
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
    <div className="space-y-8">
      <div>
        <Link
          href="/tournaments"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          All tournaments
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
        <TournamentActions tournament={tournament} />
      </div>

      <Separator />

      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Brackets</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              One bracket per skill level. Teams and matches are managed inside each bracket.
            </p>
          </div>
          <CreateBracketDialog tournamentId={tournament.id} />
        </div>

        {tournament.brackets.length === 0 ? (
          <EmptyState
            title="No brackets yet"
            description="Create a bracket for each skill level you'll be running. You can pick the format (single elimination, round robin, and more)."
            action={<CreateBracketDialog tournamentId={tournament.id} />}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tournament.brackets.map((b) => (
              <BracketSummaryCard
                key={b.id}
                bracket={b}
                tournamentId={tournament.id}
                teamCount={b.teams.length}
                matchCount={b.matches.length}
                completedMatches={b.matches.filter((m) => m.status === "COMPLETED").length}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export const dynamic = "force-dynamic"
