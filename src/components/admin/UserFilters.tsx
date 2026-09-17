"use client"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

const ROLE_CHIPS = [
  { value: "ALL", label: "All roles" },
  { value: "ADMIN", label: "Admin" },
  { value: "PLAYER", label: "Player" },
] as const

const STATUS_CHIPS = [
  { value: "ALL", label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "BANNED", label: "Banned" },
] as const

interface Props {
  initialQuery: string
  initialRole: string
  initialStatus: string
}

export function UserFilters({ initialQuery, initialRole, initialStatus }: Props) {
  const router = useRouter()
  const params = useSearchParams()
  const [q, setQ] = useState(initialQuery)

  useEffect(() => {
    const handle = setTimeout(() => {
      const next = new URLSearchParams(params.toString())
      if (q.trim()) next.set("q", q.trim())
      else next.delete("q")
      next.delete("page")
      const qs = next.toString()
      router.replace(qs ? `?${qs}` : "?", { scroll: false })
    }, 250)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  function setParam(key: "role" | "status", value: string) {
    const next = new URLSearchParams(params.toString())
    if (value === "ALL") next.delete(key)
    else next.set(key, value)
    next.delete("page")
    const qs = next.toString()
    router.replace(qs ? `?${qs}` : "?", { scroll: false })
  }

  const hasFilters = initialQuery || initialRole !== "ALL" || initialStatus !== "ALL"

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="-mx-1 flex flex-wrap items-center gap-1.5 px-1">
        {ROLE_CHIPS.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => setParam("role", c.value)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              (initialRole || "ALL") === c.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-muted"
            )}
          >
            {c.label}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-border" />
        {STATUS_CHIPS.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => setParam("status", c.value)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              (initialStatus || "ALL") === c.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-muted"
            )}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="relative w-full sm:w-64">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or email"
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
