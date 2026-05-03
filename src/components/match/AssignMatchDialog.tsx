"use client"
import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type AssignableMatch = {
  id: string
  status: "PENDING" | "IN_PROGRESS"
  court: string | null
  bracket: { id: string; skillLevel: string }
  team1: { id: string; name: string } | null
  team2: { id: string; name: string } | null
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  tournamentId: string
  courtName: string
}

export function AssignMatchDialog({ open, onOpenChange, tournamentId, courtName }: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [loading, setLoading] = useState(false)
  const [matches, setMatches] = useState<AssignableMatch[]>([])
  const [assigningId, setAssigningId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    fetch(`/api/tournaments/${tournamentId}/assignable-matches`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return
        if (j.data) setMatches(j.data)
      })
      .catch(() => toast.error("Failed to load matches"))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [open, tournamentId])

  function assign(matchId: string) {
    setAssigningId(matchId)
    start(async () => {
      const res = await fetch(`/api/matches/${matchId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ court: courtName }),
      })
      const json = await res.json().catch(() => ({}))
      setAssigningId(null)
      if (!res.ok) {
        toast.error(json.error ?? "Failed to assign")
        return
      }
      toast.success(`Assigned to ${courtName}`)
      onOpenChange(false)
      router.refresh()
    })
  }

  const available = matches.filter((m) => m.court !== courtName)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign match to {courtName}</DialogTitle>
          <DialogDescription>
            Pick a match to send to this court. Matches already on another court will be moved.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : available.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No matches available to assign. Add teams to a bracket first.
          </p>
        ) : (
          <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
            {available.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => assign(m.id)}
                disabled={pending}
                className="flex w-full items-center justify-between gap-3 rounded-md border bg-card px-3 py-2.5 text-left transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {m.bracket.skillLevel}
                    </span>
                    {m.status === "IN_PROGRESS" && (
                      <Badge variant="outline" className="border-accent text-accent-foreground">
                        Live
                      </Badge>
                    )}
                    {m.court && (
                      <Badge variant="secondary" className="text-xs">
                        On {m.court}
                      </Badge>
                    )}
                  </div>
                  <p className="truncate text-sm font-medium">
                    {m.team1?.name ?? "TBD"} <span className="text-muted-foreground">vs</span>{" "}
                    {m.team2?.name ?? "TBD"}
                  </p>
                </div>
                <Button size="sm" variant="outline" disabled={pending} asChild={false}>
                  {assigningId === m.id ? (
                    <span className="inline-flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" /> Assigning
                    </span>
                  ) : (
                    "Assign"
                  )}
                </Button>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
