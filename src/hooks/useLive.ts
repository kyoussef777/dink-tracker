"use client"
import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { getPusherClient } from "@/lib/pusher-client"

export function useLive(tournamentId: string) {
  const qc = useQueryClient()

  useEffect(() => {
    const client = getPusherClient()
    const channel = client.subscribe(`tournament-${tournamentId}`)

    channel.bind("match-updated", (data: { bracketId: string }) => {
      qc.invalidateQueries({ queryKey: ["bracket", data.bracketId] })
      qc.invalidateQueries({ queryKey: ["tournament", tournamentId] })
    })

    channel.bind("bracket-advanced", (data: { bracketId: string }) => {
      qc.invalidateQueries({ queryKey: ["bracket", data.bracketId] })
    })

    channel.bind("tournament-status-changed", () => {
      qc.invalidateQueries({ queryKey: ["tournament", tournamentId] })
    })

    return () => {
      channel.unbind_all()
      client.unsubscribe(`tournament-${tournamentId}`)
    }
  }, [tournamentId, qc])
}
