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

export interface EditableMatch {
  id: string
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "BYE"
  court: string | null
  score1: number[]
  score2: number[]
  team1: { id: string; name: string } | null
  team2: { id: string; name: string } | null
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  match: EditableMatch
  courtOptions: string[]
}

export function MatchEditDialog({ open, onOpenChange, match, courtOptions }: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [court, setCourt] = useState<string>(match.court ?? UNASSIGNED)
  const [games, setGames] = useState<Array<{ a: string; b: string }>>(() => {
    const len = Math.max(match.score1.length, match.score2.length, 1)
    return Array.from({ length: len }, (_, i) => ({
      a: String(match.score1[i] ?? ""),
      b: String(match.score2[i] ?? ""),
    }))
  })

  const bothTeams = match.team1 && match.team2
  const team1Name = match.team1?.name ?? "Team 1"
  const team2Name = match.team2?.name ?? "Team 2"

  function addGame() {
    setGames((g) => [...g, { a: "", b: "" }])
  }

  function removeGame(i: number) {
    setGames((g) => (g.length === 1 ? g : g.filter((_, idx) => idx !== i)))
  }

  function setGame(i: number, side: "a" | "b", value: string) {
    setGames((g) => g.map((row, idx) => (idx === i ? { ...row, [side]: value } : row)))
  }

  async function save(action: "save" | "complete") {
    const score1: number[] = []
    const score2: number[] = []
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

    const body: Record<string, unknown> = {
      score1,
      score2,
      court: court === UNASSIGNED ? "" : court,
    }
    if (action === "complete") body.status = "COMPLETED"
    else if (score1.length > 0) body.status = "IN_PROGRESS"

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
      toast.success(action === "complete" ? "Match completed" : "Match updated")
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

        {!bothTeams ? (
          <p className="text-sm text-muted-foreground">
            This match needs both teams set before scoring. Complete the previous round first.
          </p>
        ) : (
          <div className="space-y-5">
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

            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_5rem_5rem_2rem] items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <span>Game</span>
                <span className="truncate text-right">{team1Name}</span>
                <span className="truncate text-right">{team2Name}</span>
                <span />
              </div>
              {games.map((g, i) => (
                <div key={i} className="grid grid-cols-[1fr_5rem_5rem_2rem] items-center gap-2">
                  <span className="text-sm text-muted-foreground">Game {i + 1}</span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={g.a}
                    onChange={(e) => setGame(i, "a", e.target.value)}
                    className="text-right tabular-nums"
                  />
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={g.b}
                    onChange={(e) => setGame(i, "b", e.target.value)}
                    className="text-right tabular-nums"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
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
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          {bothTeams && (
            <>
              <Button type="button" variant="outline" onClick={() => save("save")} disabled={pending}>
                {pending ? "Saving..." : "Save"}
              </Button>
              <Button type="button" onClick={() => save("complete")} disabled={pending}>
                Complete match
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
