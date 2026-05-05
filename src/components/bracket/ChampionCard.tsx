import { Trophy, Users } from "lucide-react"
import type { Player, Team } from "@prisma/client"

interface Props {
  team: Team & { players: Player[] }
  highlightTeamIds?: string[]
}

export function ChampionCard({ team, highlightTeamIds }: Props) {
  const mine = !!highlightTeamIds?.includes(team.id)
  return (
    <div className="relative overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 p-6">
      <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-primary/10 blur-2xl" aria-hidden />
      <div className="relative space-y-3">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
          <Trophy className="h-4 w-4" />
          Champion
        </div>
        <h3 className="text-2xl font-bold tracking-tight">
          {team.name}
          {mine && (
            <span className="ml-2 align-middle text-[11px] font-semibold uppercase tracking-wider text-primary">
              You
            </span>
          )}
        </h3>
        <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          {team.players.map((p) => p.name).join(" / ")}
        </p>
      </div>
    </div>
  )
}
