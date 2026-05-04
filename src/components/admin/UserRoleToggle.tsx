"use client"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Props {
  userId: string
  initialRole: "ADMIN" | "PLAYER"
  isSelf: boolean
}

export function UserRoleToggle({ userId, initialRole, isSelf }: Props) {
  const router = useRouter()
  const [role, setRole] = useState(initialRole)
  const [pending, start] = useTransition()

  function update(next: "ADMIN" | "PLAYER") {
    if (next === role) return
    const previous = role
    setRole(next)
    start(async () => {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: next }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        toast.error(json.error ?? "Failed to update role")
        setRole(previous)
        return
      }
      toast.success(`Set to ${next}`)
      router.refresh()
    })
  }

  return (
    <Select value={role} onValueChange={(v) => update(v as "ADMIN" | "PLAYER")} disabled={pending || isSelf}>
      <SelectTrigger className="h-8 w-32 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ADMIN">Admin</SelectItem>
        <SelectItem value="PLAYER">Player</SelectItem>
      </SelectContent>
    </Select>
  )
}
