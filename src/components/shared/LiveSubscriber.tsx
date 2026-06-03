"use client"
import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { getPusherClient } from "@/lib/pusher-client"

/**
 * Subscribes to a tournament Pusher channel and triggers `router.refresh()`
 * on match-updated / bracket-advanced events so server components re-fetch.
 * Refreshes are coalesced — a single score completion emits two events
 * (match-updated + bracket-advanced), and bursts during fast scoring collapse
 * into one re-fetch instead of one per event.
 */
export function LiveSubscriber({ tournamentId }: { tournamentId: string }) {
  const router = useRouter()
  const qc = useQueryClient()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const client = getPusherClient()
    const channel = client.subscribe(`tournament-${tournamentId}`)
    const onUpdate = () => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        router.refresh()
        qc.invalidateQueries({ queryKey: ["tournament", tournamentId] })
      }, 250)
    }
    channel.bind("match-updated", onUpdate)
    channel.bind("bracket-advanced", onUpdate)
    return () => {
      if (timer.current) clearTimeout(timer.current)
      channel.unbind("match-updated", onUpdate)
      channel.unbind("bracket-advanced", onUpdate)
      client.unsubscribe(`tournament-${tournamentId}`)
    }
  }, [tournamentId, router, qc])

  return null
}
