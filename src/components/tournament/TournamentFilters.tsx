"use client"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { TournamentStatus } from "@prisma/client"

const CHIPS: { value: TournamentStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "REGISTRATION", label: "Registration" },
  { value: "ACTIVE", label: "Active" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
]

interface Props {
  initialStatus: TournamentStatus | null
  initialQuery: string
}

export function TournamentFilters({ initialStatus, initialQuery }: Props) {
  const router = useRouter()
  const params = useSearchParams()
  const [q, setQ] = useState(initialQuery)

  useEffect(() => {
    const handle = setTimeout(() => {
      const next = new URLSearchParams(params.toString())
      if (q.trim()) next.set("q", q.trim())
      else next.delete("q")
      const qs = next.toString()
      router.replace(qs ? `?${qs}` : "?", { scroll: false })
    }, 250)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  function setStatus(value: TournamentStatus | "ALL") {
    const next = new URLSearchParams(params.toString())
    if (value === "ALL") next.delete("status")
    else next.set("status", value)
    const qs = next.toString()
    router.replace(qs ? `?${qs}` : "?", { scroll: false })
  }

  const active = initialStatus ?? "ALL"
  const hasFilters = initialStatus || initialQuery

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="-mx-1 flex flex-wrap items-center gap-1.5 px-1">
        {CHIPS.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => setStatus(c.value)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              active === c.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-muted"
            )}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="relative w-full sm:w-72">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or venue"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-8 pr-8"
        />
        {hasFilters && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2"
            onClick={() => {
              setQ("")
              router.replace("?", { scroll: false })
            }}
            aria-label="Clear filters"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}
