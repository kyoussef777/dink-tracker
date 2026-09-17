"use client"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  page: number
  totalPages: number
}

export function UserPagination({ page, totalPages }: Props) {
  const router = useRouter()
  const params = useSearchParams()

  if (totalPages <= 1) return null

  function goTo(next: number) {
    const sp = new URLSearchParams(params.toString())
    if (next <= 1) sp.delete("page")
    else sp.set("page", String(next))
    const qs = sp.toString()
    router.push(qs ? `?${qs}` : "?", { scroll: false })
  }

  return (
    <div className="flex items-center justify-between px-1">
      <p className="text-xs text-muted-foreground">
        Page {page} of {totalPages}
      </p>
      <div className="flex items-center gap-1.5">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => goTo(page - 1)}>
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => goTo(page + 1)}>
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
