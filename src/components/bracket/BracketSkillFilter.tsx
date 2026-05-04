"use client"
import { useRouter, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"

interface Props {
  skills: string[]
  initial: string | null
}

export function BracketSkillFilter({ skills, initial }: Props) {
  const router = useRouter()
  const params = useSearchParams()

  function pick(value: string | null) {
    const next = new URLSearchParams(params.toString())
    if (value === null) next.delete("skill")
    else next.set("skill", value)
    const qs = next.toString()
    router.replace(qs ? `?${qs}` : "?", { scroll: false })
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={() => pick(null)}
        className={cn(
          "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
          initial === null
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border text-muted-foreground hover:bg-muted"
        )}
      >
        All skills
      </button>
      {skills.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => pick(s)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            initial === s
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border text-muted-foreground hover:bg-muted"
          )}
        >
          {s}
        </button>
      ))}
    </div>
  )
}
