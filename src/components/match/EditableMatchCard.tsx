"use client"
import { useState } from "react"
import { MatchCard } from "@/components/bracket/MatchCard"
import { MatchEditDialog, type TeamOption } from "./MatchEditDialog"
import type { Match, Team } from "@prisma/client"

type MatchWithTeams = Match & { team1: Team | null; team2: Team | null; winner: Team | null }

interface Props {
  match: MatchWithTeams
  courtOptions: string[]
  highlightTeamIds?: string[]
  teamOptions?: TeamOption[]
}

export function EditableMatchCard({ match, courtOptions, highlightTeamIds, teamOptions }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block w-full text-left transition-transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-ring rounded-lg"
        aria-label={`Edit match ${match.team1?.name ?? "TBD"} vs ${match.team2?.name ?? "TBD"}`}
      >
        <MatchCard match={match} highlightTeamIds={highlightTeamIds} />
      </button>
      <MatchEditDialog
        open={open}
        onOpenChange={setOpen}
        courtOptions={courtOptions}
        teamOptions={teamOptions}
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
