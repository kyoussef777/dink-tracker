import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { TournamentCard } from "@/components/tournament/TournamentCard"
import { CreateTournamentDialog } from "@/components/tournament/CreateTournamentDialog"
import { EmptyState } from "@/components/shared/EmptyState"

export default async function TournamentsPage() {
  const { userId } = await auth()
  const tournaments = userId
    ? await db.tournament.findMany({
        where: { createdBy: userId },
        orderBy: { startDate: "desc" },
        include: { _count: { select: { brackets: true } } },
      })
    : []

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tournaments</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {tournaments.length === 0
              ? "Create your first tournament to get started."
              : `${tournaments.length} ${tournaments.length === 1 ? "tournament" : "tournaments"}`}
          </p>
        </div>
        <CreateTournamentDialog />
      </div>

      {tournaments.length === 0 ? (
        <EmptyState
          title="No tournaments yet"
          description="A tournament holds one or more brackets, each with its own skill level. Create one to get going."
          action={<CreateTournamentDialog />}
        />
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
