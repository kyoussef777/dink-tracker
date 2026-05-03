"use client"
import { useState } from "react"
import { MatchCard } from "@/components/bracket/MatchCard"
import { MatchEditDialog } from "./MatchEditDialog"
import type { Match, Team } from "@prisma/client"

type MatchWithTeams = Match & { team1: Team | null; team2: Team | null; winner: Team | null }

interface Props {
  match: MatchWithTeams
  courtOptions: string[]
}

export function EditableMatchCard({ match, courtOptions }: Props) {
  const [open, setOpen] = useState(false)
  const disabled = match.status === "BYE"

  return (
    <>
      <button
        type="button"
        onClick={() => !disabled && setOpen(true)}
        disabled={disabled}
        className="block w-full text-left transition-transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-ring rounded-lg disabled:cursor-not-allowed disabled:hover:translate-y-0"
        aria-label={`Edit match ${match.team1?.name ?? "TBD"} vs ${match.team2?.name ?? "TBD"}`}
      >
        <MatchCard match={match} />
      </button>
      <MatchEditDialog
        open={open}
        onOpenChange={setOpen}
        courtOptions={courtOptions}
        match={{
          id: match.id,
          status: match.status,
          court: match.court,
          score1: match.score1,
          score2: match.score2,
          team1: match.team1 ? { id: match.team1.id, name: match.team1.name } : null,
          team2: match.team2 ? { id: match.team2.id, name: match.team2.name } : null,
        }}
      />
    </>
  )
}
