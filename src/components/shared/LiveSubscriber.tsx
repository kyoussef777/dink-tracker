"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { getPusherClient } from "@/lib/pusher-client"

/**
 * Subscribes to a tournament Pusher channel and triggers `router.refresh()`
 * on match-updated / bracket-advanced events so server components re-fetch.
 */
export function LiveSubscriber({ tournamentId }: { tournamentId: string }) {
  const router = useRouter()
  const qc = useQueryClient()

  useEffect(() => {
    const client = getPusherClient()
    const channel = client.subscribe(`tournament-${tournamentId}`)
    const onUpdate = () => {
      router.refresh()
      qc.invalidateQueries({ queryKey: ["tournament", tournamentId] })
    }
    channel.bind("match-updated", onUpdate)
    channel.bind("bracket-advanced", onUpdate)
    return () => {
      channel.unbind("match-updated", onUpdate)
      channel.unbind("bracket-advanced", onUpdate)
      client.unsubscribe(`tournament-${tournamentId}`)
    }
  }, [tournamentId, router, qc])

  return null
}
