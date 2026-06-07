"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Pencil, Trash2, Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

export interface ManagedPlayer {
  name: string
  email: string | null
  phone: string | null
  rating: number | null
}

export interface ManagedTeam {
  id: string
  name: string
  seed: number | null
  players: ManagedPlayer[]
}

export function TeamManageDialog({
  bracketId,
  team,
  open,
  onOpenChange,
}: {
  bracketId: string
  /** Omit to add a new team; provide to edit an existing one. */
  team?: ManagedTeam
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const router = useRouter()
  const isEdit = team != null
  const [saving, setSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [name, setName] = useState(team?.name ?? "")
  const [seed, setSeed] = useState(team?.seed != null ? String(team.seed) : "")
  const [players, setPlayers] = useState(
    team && team.players.length > 0
      ? team.players.map((p) => ({ name: p.name, email: p.email ?? "", phone: p.phone ?? "" }))
      : [{ name: "", email: "", phone: "" }]
  )

  function setPlayer(i: number, field: "name" | "email" | "phone", value: string) {
    setPlayers((ps) => ps.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)))
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Team name is required")
      return
    }
    const cleaned = players.filter((p) => p.name.trim())
    if (cleaned.length === 0) {
      toast.error("Add at least one player")
      return
    }
    const mappedPlayers = cleaned.map((p) => ({
      name: p.name.trim(),
      email: p.email.trim() || undefined,
      phone: p.phone.trim() || undefined,
    }))
    setSaving(true)
    try {
      const res = isEdit
        ? await fetch(`/api/brackets/${bracketId}/teams/${team.id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              name: name.trim(),
              seed: seed.trim() === "" ? null : Number(seed),
              players: mappedPlayers,
            }),
          })
        : await fetch(`/api/brackets/${bracketId}/teams`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ teams: [{ name: name.trim(), players: mappedPlayers }] }),
          })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? (isEdit ? "Failed to update team" : "Failed to add team"))
      toast.success(isEdit ? "Team updated" : "Team added. Regenerate the bracket to include it in the draw.")
      onOpenChange(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!team) return
    setSaving(true)
    try {
      const res = await fetch(`/api/brackets/${bracketId}/teams/${team.id}`, { method: "DELETE" })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? "Failed to delete team")
      toast.success("Team removed. Regenerate the bracket to rebuild matches.")
      setDeleteOpen(false)
      onOpenChange(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit team" : "Add team"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Rename, reseed, or update players. Removing or reseeding teams may require regenerating the bracket."
              : "Add a single team to this bracket. Regenerate the bracket afterward to include it in the draw."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Seed is an edit-only concern; new teams are auto-seeded after the current ones. */}
          <div className={isEdit ? "grid grid-cols-[1fr_5rem] gap-3" : ""}>
            <div className="space-y-2">
              <Label htmlFor="team-name">Team name</Label>
              <Input
                id="team-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="The Dinkers"
              />
            </div>
            {isEdit && (
              <div className="space-y-2">
                <Label htmlFor="team-seed">Seed</Label>
                <Input
                  id="team-seed"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Players</Label>
            {players.map((p, i) => (
              <div key={i} className="grid grid-cols-1 gap-2 rounded-md border p-2 sm:grid-cols-3">
                <Input
                  placeholder="Name"
                  value={p.name}
                  onChange={(e) => setPlayer(i, "name", e.target.value)}
                  aria-label={`Player ${i + 1} name`}
                />
                <Input
                  placeholder="Email"
                  type="email"
                  value={p.email}
                  onChange={(e) => setPlayer(i, "email", e.target.value)}
                  aria-label={`Player ${i + 1} email`}
                />
                <div className="flex gap-2">
                  <Input
                    placeholder="Phone"
                    value={p.phone}
                    onChange={(e) => setPlayer(i, "phone", e.target.value)}
                    aria-label={`Player ${i + 1} phone`}
                  />
                  {players.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={() => setPlayers((ps) => ps.filter((_, idx) => idx !== i))}
                      aria-label={`Remove player ${i + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {players.length < 4 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setPlayers((ps) => [...ps, { name: "", email: "", phone: "" }])}
              >
                <Plus className="h-3.5 w-3.5" />
                Add player
              </Button>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          {isEdit ? (
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteOpen(true)}
              disabled={saving}
            >
              <Trash2 className="h-4 w-4" />
              Remove team
            </Button>
          ) : (
            <span className="hidden sm:block" />
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : isEdit ? "Save" : "Add team"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      {isEdit && (
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {team.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              The team is detached from any matches it&apos;s in. Regenerate the bracket afterward to rebuild a clean
              draw. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      )}
    </Dialog>
  )
}

/** Pencil button that opens the team manager. Rendered on each admin team card. */
export function EditTeamButton({ bracketId, team }: { bracketId: string; team: ManagedTeam }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground"
        onClick={() => setOpen(true)}
        aria-label={`Edit ${team.name}`}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      {open && <TeamManageDialog bracketId={bracketId} team={team} open={open} onOpenChange={setOpen} />}
    </>
  )
}

/** Button that opens the team manager in "add" mode for a bracket. Admin only. */
export function AddTeamButton({ bracketId }: { bracketId: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Add team
      </Button>
      {open && <TeamManageDialog bracketId={bracketId} open={open} onOpenChange={setOpen} />}
    </>
  )
}
