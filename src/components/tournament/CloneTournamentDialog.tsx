"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
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

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  tournamentId: string
  tournamentName: string
}

/**
 * Admin-only dialog to duplicate a tournament — brackets, teams, players, and
 * draws — into a fresh DRAFT copy for testing. Optionally copies match results.
 */
export function CloneTournamentDialog({ open, onOpenChange, tournamentId, tournamentName }: Props) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [includeResults, setIncludeResults] = useState(true)
  const [cloning, setCloning] = useState(false)

  // Reset the form to sensible defaults each time the dialog opens.
  useEffect(() => {
    if (open) {
      setName(`Copy of ${tournamentName}`)
      setIncludeResults(true)
    }
  }, [open, tournamentName])

  async function handleClone() {
    setCloning(true)
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/clone`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim() || undefined, includeResults }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? "Failed")
      toast.success("Tournament duplicated")
      onOpenChange(false)
      router.push(`/tournaments/${json.data.id}`)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to duplicate")
    } finally {
      setCloning(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Duplicate tournament</DialogTitle>
          <DialogDescription>
            Creates a new draft copy with all brackets, teams, and players. Useful for testing
            without affecting the original.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clone-name">New tournament name</Label>
            <Input
              id="clone-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
              autoFocus
              maxLength={100}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !cloning) handleClone()
              }}
            />
          </div>
          <label className="flex items-start gap-3 rounded-md border p-3 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-[#6ab04c]"
              checked={includeResults}
              onChange={(e) => setIncludeResults(e.target.checked)}
            />
            <span>
              <span className="font-medium text-foreground">Copy match results</span>
              <span className="mt-0.5 block text-muted-foreground">
                Include scores and winners. Uncheck to copy only the structure and start the draws
                fresh.
              </span>
            </span>
          </label>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={cloning}>
            Cancel
          </Button>
          <Button type="button" onClick={handleClone} disabled={cloning || !name.trim()}>
            {cloning ? "Duplicating..." : "Duplicate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
