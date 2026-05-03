"use client"
import Link from "next/link"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Users, X } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LiveIndicator } from "@/components/shared/LiveIndicator"
import { AssignMatchDialog } from "./AssignMatchDialog"

type CourtMatch = {
  id: string
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "BYE"
  bracket: { id: string; skillLevel: string }
  team1: { id: string; name: string; players: { name: string }[] } | null
  team2: { id: string; name: string; players: { name: string }[] } | null
}

interface Props {
  courtName: string
  tournamentId: string
  live: CourtMatch | null
  queued: CourtMatch[]
}

export function CourtCard({ courtName, tournamentId, live, queued }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false)

  return (
    <>
      <Card className={live ? "border-accent/60" : undefined}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-lg">{courtName}</CardTitle>
            {live ? <LiveIndicator /> : <Badge variant="secondary">Open</Badge>}
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {live ? (
            <CourtMatchRow match={live} tournamentId={tournamentId} courtName={courtName} highlight />
          ) : (
            <p className="text-muted-foreground">No match in progress.</p>
          )}

          {queued.length > 0 && (
            <div className="space-y-2 border-t pt-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Queued
              </p>
              {queued.map((m) => (
                <CourtMatchRow
                  key={m.id}
                  match={m}
                  tournamentId={tournamentId}
                  courtName={courtName}
                />
              ))}
            </div>
          )}

          <div className="flex justify-end pt-1">
            <Button size="sm" variant="outline" onClick={() => setPickerOpen(true)}>
              Assign match
            </Button>
          </div>
        </CardContent>
      </Card>

      <AssignMatchDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        tournamentId={tournamentId}
        courtName={courtName}
      />
    </>
  )
}

function CourtMatchRow({
  match,
  tournamentId,
  courtName,
  highlight,
}: {
  match: CourtMatch
  tournamentId: string
  courtName: string
  highlight?: boolean
}) {
  const router = useRouter()
  const [pending, start] = useTransition()

  function clearCourt(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    start(async () => {
      const res = await fetch(`/api/matches/${match.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ court: "" }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        toast.error(json.error ?? "Failed to clear court")
        return
      }
      toast.success(`Cleared ${courtName}`)
      router.refresh()
    })
  }

  return (
    <div className="group relative">
      <Link
        href={`/tournaments/${tournamentId}/brackets/${match.bracket.id}`}
        className="block rounded-md border bg-card px-3 py-2 transition-colors hover:bg-muted/40"
      >
        <div className="flex items-center justify-between gap-2 pr-6">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {match.bracket.skillLevel}
          </span>
          {highlight && <span className="text-xs font-medium text-accent-foreground">Now</span>}
        </div>
        <div className="mt-1 space-y-1">
          <TeamLine team={match.team1} />
          <TeamLine team={match.team2} />
        </div>
      </Link>
      <button
        type="button"
        onClick={clearCourt}
        disabled={pending}
        className="absolute right-1.5 top-1.5 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground focus:opacity-100 group-hover:opacity-100 disabled:cursor-not-allowed"
        aria-label="Remove from court"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function TeamLine({ team }: { team: { name: string; players: { name: string }[] } | null }) {
  if (!team) return <p className="text-sm text-muted-foreground">TBD</p>
  return (
    <div className="space-y-0.5">
      <p className="font-medium leading-tight">{team.name}</p>
      <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Users className="h-3 w-3" />
        {team.players.map((p) => p.name).join(" / ")}
      </p>
    </div>
  )
}
