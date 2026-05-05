import { Trophy } from "lucide-react"
import { cn } from "@/lib/utils"
import type { StandingRow } from "@/lib/standings"

interface Props {
  rows: StandingRow[]
  highlightTeamIds?: string[]
}

export function StandingsTable({ rows, highlightTeamIds }: Props) {
  if (rows.length === 0) return null
  const podium = new Set([1, 2, 3])

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <th className="px-3 py-2 text-left font-medium">#</th>
            <th className="px-3 py-2 text-left font-medium">Team</th>
            <th className="px-2 py-2 text-right font-medium" title="Played">P</th>
            <th className="px-2 py-2 text-right font-medium" title="Wins">W</th>
            <th className="px-2 py-2 text-right font-medium" title="Losses">L</th>
            <th className="hidden px-2 py-2 text-right font-medium sm:table-cell" title="Games won–lost">
              Games
            </th>
            <th className="px-3 py-2 text-right font-medium" title="Point differential">
              Diff
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const mine = !!highlightTeamIds?.includes(r.team.id)
            return (
              <tr
                key={r.team.id}
                className={cn(
                  "border-b last:border-0 transition-colors",
                  mine && "bg-primary/[0.04]"
                )}
              >
                <td className="px-3 py-2.5 text-muted-foreground tabular-nums">
                  {podium.has(r.rank) ? (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 font-semibold",
                        r.rank === 1 && "text-amber-500",
                        r.rank === 2 && "text-zinc-400",
                        r.rank === 3 && "text-amber-700"
                      )}
                    >
                      <Trophy className="h-3.5 w-3.5" />
                      {r.rank}
                    </span>
                  ) : (
                    r.rank
                  )}
                </td>
                <td className="px-3 py-2.5 font-medium">
                  {r.team.name}
                  {mine && (
                    <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary/70">
                      You
                    </span>
                  )}
                </td>
                <td className="px-2 py-2.5 text-right tabular-nums text-muted-foreground">{r.played}</td>
                <td className="px-2 py-2.5 text-right tabular-nums font-semibold">{r.wins}</td>
                <td className="px-2 py-2.5 text-right tabular-nums text-muted-foreground">{r.losses}</td>
                <td className="hidden px-2 py-2.5 text-right tabular-nums text-muted-foreground sm:table-cell">
                  {r.gamesWon}–{r.gamesLost}
                </td>
                <td
                  className={cn(
                    "px-3 py-2.5 text-right tabular-nums font-medium",
                    r.pointDiff > 0 && "text-primary",
                    r.pointDiff < 0 && "text-muted-foreground"
                  )}
                >
                  {r.pointDiff > 0 ? `+${r.pointDiff}` : r.pointDiff}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
