"use client"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const UNASSIGNED = "__unassigned"
const NONE = "__none"

export interface EditableMatch {
  id: string
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "BYE"
  court: string | null
  score1: number[]
  score2: number[]
  team1: { id: string; name: string } | null
  team2: { id: string; name: string } | null
  round?: number
}

export interface TeamOption {
  id: string
  name: string
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  match: EditableMatch
  courtOptions: string[]
  /** All teams in the bracket — lets admins move/swap teams into this match. */
  teamOptions?: TeamOption[]
  /** Total rounds in the bracket — enables moving this match to another round. */
  totalRounds?: number
}

export function MatchEditDialog({ open, onOpenChange, match, courtOptions, teamOptions = [], totalRounds }: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [court, setCourt] = useState<string>(match.court ?? UNASSIGNED)
  const [team1Id, setTeam1Id] = useState<string>(match.team1?.id ?? NONE)
  const [team2Id, setTeam2Id] = useState<string>(match.team2?.id ?? NONE)
  const [round, setRound] = useState<string>(match.round != null ? String(match.round) : NONE)
  const canEditRound = totalRounds != null && totalRounds > 1 && match.round != null
  const [games, setGames] = useState<Array<{ a: string; b: string }>>(() => {
    const len = Math.max(match.score1.length, match.score2.length, 1)
    return Array.from({ length: len }, (_, i) => ({
      a: String(match.score1[i] ?? ""),
      b: String(match.score2[i] ?? ""),
    }))
  })

  // Soft heads-up: a finished game can't end level. Flags tied games (both
  // scores filled and equal) so a fat-fingered score gets noticed — never blocks.
  const tiedGames = games
    .map((g, i) => ({ n: i + 1, a: Number(g.a), b: Number(g.b), filled: g.a !== "" && g.b !== "" }))
    .filter((g) => g.filled && !Number.isNaN(g.a) && !Number.isNaN(g.b) && g.a === g.b)
    .map((g) => g.n)

  const canEditTeams = teamOptions.length > 0
  const resolvedT1 = teamOptions.find((t) => t.id === team1Id) ?? match.team1
  const resolvedT2 = teamOptions.find((t) => t.id === team2Id) ?? match.team2
  const bothTeams = team1Id !== NONE && team2Id !== NONE
  const team1Name = resolvedT1?.name ?? "Team 1"
  const team2Name = resolvedT2?.name ?? "Team 2"
  const teamsChanged = team1Id !== (match.team1?.id ?? NONE) || team2Id !== (match.team2?.id ?? NONE)

  function addGame() {
    setGames((g) => [...g, { a: "", b: "" }])
  }

  function removeGame(i: number) {
    setGames((g) => (g.length === 1 ? g : g.filter((_, idx) => idx !== i)))
  }

  function setGame(i: number, side: "a" | "b", value: string) {
    setGames((g) => g.map((row, idx) => (idx === i ? { ...row, [side]: value } : row)))
  }

  async function save(action: "save" | "complete" | "reopen", winnerId?: string) {
    const score1: number[] = []
    const score2: number[] = []
    if (action !== "reopen") {
      for (const g of games) {
        const a = g.a === "" ? null : Number(g.a)
        const b = g.b === "" ? null : Number(g.b)
        if (a === null && b === null) continue
        if (a === null || b === null || Number.isNaN(a) || Number.isNaN(b) || a < 0 || b < 0) {
          toast.error("Each game needs a numeric score for both teams")
          return
        }
        score1.push(a)
        score2.push(b)
      }
    }

    const body: Record<string, unknown> = {
      court: court === UNASSIGNED ? "" : court,
    }
    if (canEditTeams) {
      body.team1Id = team1Id === NONE ? null : team1Id
      body.team2Id = team2Id === NONE ? null : team2Id
    }
    if (canEditRound && round !== NONE && Number(round) !== match.round) {
      body.round = Number(round)
    }
    if (action === "reopen") {
      body.score1 = []
      body.score2 = []
      body.winnerId = null
      body.status = "PENDING"
    } else {
      body.score1 = score1
      body.score2 = score2
      if (winnerId) body.winnerId = winnerId
      if (action === "complete") body.status = "COMPLETED"
      else if (score1.length > 0) body.status = "IN_PROGRESS"
    }

    start(async () => {
      const res = await fetch(`/api/matches/${match.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(json.error ?? "Failed to update match")
        return
      }
      toast.success(
        action === "complete" ? "Match completed" : action === "reopen" ? "Match reopened" : "Match updated"
      )
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Match scoring</DialogTitle>
          <DialogDescription>
            Enter game-by-game scores. Pickleball games typically run to 11 (win by 2).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {canEditTeams && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Team 1</Label>
                <Select value={team1Id} onValueChange={setTeam1Id}>
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Unassigned</SelectItem>
                    {teamOptions.map((t) => (
                      <SelectItem key={t.id} value={t.id} disabled={t.id === team2Id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Team 2</Label>
                <Select value={team2Id} onValueChange={setTeam2Id}>
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Unassigned</SelectItem>
                    {teamOptions.map((t) => (
                      <SelectItem key={t.id} value={t.id} disabled={t.id === team1Id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Court</Label>
            <Select value={court} onValueChange={setCourt}>
              <SelectTrigger>
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                {courtOptions.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {courtOptions.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No courts configured. Set a court count on the tournament to enable assignment.
              </p>
            )}
          </div>

          {canEditRound && (
            <div className="space-y-2">
              <Label>Round</Label>
              <Select value={round} onValueChange={setRound}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: totalRounds! }, (_, i) => i + 1).map((r) => (
                    <SelectItem key={r} value={String(r)}>
                      Round {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Moving a match between rounds is manual — it won&apos;t rewire advancement.
              </p>
            </div>
          )}

          {!bothTeams ? (
            <p className="text-sm text-muted-foreground">
              {canEditTeams
                ? "Assign both teams above to enter scores."
                : "This match needs both teams set before scoring. Complete the previous round first."}
            </p>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-[auto_1fr_1fr_auto] items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <span className="w-12">Game</span>
                <span className="truncate text-right">{team1Name}</span>
                <span className="truncate text-right">{team2Name}</span>
                <span className="w-8" />
              </div>
              {games.map((g, i) => (
                <div key={i} className="grid grid-cols-[auto_1fr_1fr_auto] items-center gap-2">
                  <span className="w-12 text-sm text-muted-foreground">#{i + 1}</span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={g.a}
                    onChange={(e) => setGame(i, "a", e.target.value)}
                    className="text-right tabular-nums"
                    aria-label={`${team1Name} game ${i + 1} score`}
                  />
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={g.b}
                    onChange={(e) => setGame(i, "b", e.target.value)}
                    className="text-right tabular-nums"
                    aria-label={`${team2Name} game ${i + 1} score`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => removeGame(i)}
                    disabled={games.length === 1}
                    aria-label={`Remove game ${i + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addGame} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Add game
              </Button>

              {tiedGames.length > 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-500">
                  {tiedGames.length === 1 ? `Game ${tiedGames[0]} is` : `Games ${tiedGames.join(", ")} are`} tied — a
                  finished game can&apos;t end level. Double-check the score.
                </p>
              )}

              {/* Manual winner override — useful for forfeits/walkovers. */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Set winner
                </span>
                {resolvedT1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={() => save("complete", resolvedT1.id)}
                  >
                    {team1Name}
                  </Button>
                )}
                {resolvedT2 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={() => save("complete", resolvedT2.id)}
                  >
                    {team2Name}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <div>
            {match.status === "COMPLETED" && (
              <Button type="button" variant="ghost" onClick={() => save("reopen")} disabled={pending}>
                Reopen match
              </Button>
            )}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="button" variant="outline" onClick={() => save("save")} disabled={pending || (!bothTeams && !teamsChanged)}>
              {pending ? "Saving..." : "Save"}
            </Button>
            {bothTeams && (
              <Button type="button" onClick={() => save("complete")} disabled={pending}>
                Complete
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
