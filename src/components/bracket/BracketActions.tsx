"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { MoreHorizontal, Trash2, RefreshCw, Waves } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export function BracketActions({
  bracketId,
  tournamentId,
  hasTeams,
  maxActiveMatches = 0,
}: {
  bracketId: string
  tournamentId: string
  hasTeams?: boolean
  maxActiveMatches?: number
}) {
  const router = useRouter()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [regenOpen, setRegenOpen] = useState(false)
  const [waveOpen, setWaveOpen] = useState(false)
  const [cap, setCap] = useState(String(maxActiveMatches))
  const [busy, setBusy] = useState(false)

  async function handleWave() {
    setBusy(true)
    try {
      const res = await fetch(`/api/brackets/${bracketId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ maxActiveMatches: Math.max(0, Number(cap) || 0) }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? "Failed")
      const n = json.data.maxActiveMatches as number
      toast.success(n > 0 ? `Capped at ${n} live ${n === 1 ? "match" : "matches"}` : "Wave cap removed")
      setWaveOpen(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update")
      setBusy(false)
    }
  }

  async function handleDelete() {
    setBusy(true)
    try {
      const res = await fetch(`/api/brackets/${bracketId}`, { method: "DELETE" })
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed")
      toast.success("Bracket deleted")
      router.push(`/tournaments/${tournamentId}`)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete")
      setBusy(false)
    }
  }

  async function handleRegenerate() {
    setBusy(true)
    try {
      const res = await fetch(`/api/brackets/${bracketId}/regenerate`, { method: "POST" })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? "Failed")
      toast.success(`Bracket rebuilt — ${json.data.matchCount} matches`)
      setRegenOpen(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to regenerate")
      setBusy(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Bracket actions">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {hasTeams && (
            <>
              <DropdownMenuItem onSelect={() => setWaveOpen(true)}>
                <Waves className="h-4 w-4" />
                Wave cap{maxActiveMatches > 0 ? ` (${maxActiveMatches})` : ""}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setRegenOpen(true)}>
                <RefreshCw className="h-4 w-4" />
                Regenerate bracket
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            Delete bracket
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={waveOpen} onOpenChange={setWaveOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Wave cap</DialogTitle>
            <DialogDescription>
              Limit how many matches in this bracket can be live (in progress) at once — usually the number of courts
              you&apos;ve given it. Matches trickle in as live ones finish. Set 0 for no limit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="wave-cap">Max live matches</Label>
            <Input
              id="wave-cap"
              type="number"
              inputMode="numeric"
              min={0}
              max={64}
              value={cap}
              onChange={(e) => setCap(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setWaveOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="button" onClick={handleWave} disabled={busy}>
              {busy ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={regenOpen} onOpenChange={setRegenOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate this bracket?</AlertDialogTitle>
            <AlertDialogDescription>
              Rebuilds the draw from the current teams in seed order. All existing matches, scores, and results are
              discarded. Teams and players are kept. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRegenerate} disabled={busy}>
              {busy ? "Rebuilding..." : "Regenerate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this bracket?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes all teams and matches in this bracket. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={busy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
