"use client"
import { useEffect, useState } from "react"

export type PlayerSearchResult = {
  id: string
  name: string
  email: string | null
  rating: number | null
  team: {
    id: string
    name: string
    bracket: {
      id: string
      skillLevel: string
      tournament: { id: string; name: string }
    }
  }
}

export function usePlayerSearch(query: string, tournamentId?: string) {
  const [results, setResults] = useState<PlayerSearchResult[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 1) {
      setResults([])
      setLoading(false)
      return
    }
    let cancelled = false
    const timer = setTimeout(() => {
      setLoading(true)
      const params = new URLSearchParams({ q: trimmed })
      if (tournamentId) params.set("tournamentId", tournamentId)
      fetch(`/api/players/search?${params.toString()}`)
        .then((r) => r.json())
        .then((j) => {
          if (cancelled) return
          if (j.data) setResults(j.data)
        })
        .catch(() => {})
        .finally(() => !cancelled && setLoading(false))
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query, tournamentId])

  return { results, loading }
}
