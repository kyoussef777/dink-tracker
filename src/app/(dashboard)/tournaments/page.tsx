import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { getCurrentRole } from "@/lib/auth"
import { TournamentCard } from "@/components/tournament/TournamentCard"
import { CreateTournamentDialog } from "@/components/tournament/CreateTournamentDialog"
import { TournamentFilters } from "@/components/tournament/TournamentFilters"
import { PlayerSearch } from "@/components/player/PlayerSearch"
import { EmptyState } from "@/components/shared/EmptyState"
import type { TournamentStatus } from "@prisma/client"

const STATUSES: TournamentStatus[] = ["DRAFT", "REGISTRATION", "ACTIVE", "COMPLETED", "CANCELLED"]

type SearchParams = { status?: string; q?: string }

export default async function TournamentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const current = await getCurrentRole()
  if (!current) redirect("/sign-in")
  if (current.role !== "ADMIN") redirect("/my")

  const sp = await searchParams
  const statusFilter =
    sp.status && STATUSES.includes(sp.status as TournamentStatus) ? (sp.status as TournamentStatus) : null
  const q = sp.q?.trim() ?? ""

  const tournaments = await db.tournament.findMany({
    where: {
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(q
        ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { venue: { contains: q, mode: "insensitive" } }] }
        : {}),
    },
    orderBy: { startDate: "desc" },
    include: { _count: { select: { brackets: true } } },
  })

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Tournaments</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {tournaments.length === 0 && !statusFilter && !q
              ? "Create your first tournament to get started."
              : `${tournaments.length} ${tournaments.length === 1 ? "tournament" : "tournaments"}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PlayerSearch />
          <CreateTournamentDialog />
        </div>
      </div>

      <TournamentFilters initialStatus={statusFilter} initialQuery={q} />

      {tournaments.length === 0 ? (
        statusFilter || q ? (
          <EmptyState
            title="No matches"
            description="No tournaments match the current filters. Try clearing them."
          />
        ) : (
          <EmptyState
            title="No tournaments yet"
            description="A tournament holds one or more brackets, each with its own skill level. Create one to get going."
            action={<CreateTournamentDialog />}
          />
        )
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tournaments.map((t) => (
            <TournamentCard key={t.id} tournament={t} />
          ))}
        </div>
      )}
    </div>
  )
}

export const dynamic = "force-dynamic"
