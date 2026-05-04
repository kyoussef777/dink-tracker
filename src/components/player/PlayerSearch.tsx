"use client"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Search } from "lucide-react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { usePlayerSearch } from "@/hooks/usePlayerSearch"

interface Props {
  tournamentId?: string
  triggerLabel?: string
}

export function PlayerSearch({ tournamentId, triggerLabel = "Find a player" }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const { results, loading } = usePlayerSearch(query, tournamentId)

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5 text-muted-foreground"
      >
        <Search className="h-3.5 w-3.5" />
        <span>{triggerLabel}</span>
        <kbd className="ml-1 hidden rounded border bg-muted px-1 text-[10px] sm:inline">⌘K</kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput value={query} onValueChange={setQuery} placeholder="Search by player name or email..." />
        <CommandList>
          {!loading && query.trim() && results.length === 0 && (
            <CommandEmpty>No players found.</CommandEmpty>
          )}
          {loading && <CommandEmpty>Searching...</CommandEmpty>}
          {!query.trim() && <CommandEmpty>Type to search across players.</CommandEmpty>}
          {results.length > 0 && (
            <CommandGroup heading="Players">
              {results.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`${p.id} ${p.name} ${p.email ?? ""}`}
                  onSelect={() => {
                    setOpen(false)
                    router.push(
                      `/tournaments/${p.team.bracket.tournament.id}/brackets/${p.team.bracket.id}`
                    )
                  }}
                >
                  <div className="flex w-full items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {p.team.name} · {p.team.bracket.skillLevel} · {p.team.bracket.tournament.name}
                      </p>
                    </div>
                    {p.email && (
                      <span className="hidden truncate text-xs text-muted-foreground sm:inline">{p.email}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
