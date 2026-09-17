"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/utils"

export interface PendingInvitation {
  id: string
  emailAddress: string
  role: "ADMIN" | "PLAYER"
  createdAt: number
}

export function PendingInvitations({ invitations }: { invitations: PendingInvitation[] }) {
  const router = useRouter()
  const [revokingId, setRevokingId] = useState<string | null>(null)

  if (invitations.length === 0) return null

  async function revoke(id: string, email: string) {
    setRevokingId(id)
    try {
      const res = await fetch(`/api/admin/users/invitations/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Failed to revoke")
      toast.success(`Revoked invite to ${email}`)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke invite")
    } finally {
      setRevokingId(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          Pending invitations
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {invitations.length} awaiting sign-up
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y">
          {invitations.map((inv) => (
            <li key={inv.id} className="flex items-center justify-between gap-4 px-4 py-2.5">
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm">{inv.emailAddress}</p>
                  <Badge variant="outline" className="text-[10px]">
                    {inv.role === "ADMIN" ? "Admin" : "Player"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">Invited {formatDate(new Date(inv.createdAt))}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                disabled={revokingId === inv.id}
                onClick={() => revoke(inv.id, inv.emailAddress)}
                aria-label={`Revoke invite to ${inv.emailAddress}`}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
