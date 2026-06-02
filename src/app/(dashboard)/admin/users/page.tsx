import { redirect } from "next/navigation"
import { clerkClient } from "@clerk/nextjs/server"
import { getCurrentRole } from "@/lib/auth"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { UserRoleToggle } from "@/components/admin/UserRoleToggle"
import { Separator } from "@/components/ui/separator"

export default async function AdminUsersPage() {
  const current = await getCurrentRole()
  if (!current || current.role !== "ADMIN") redirect("/tournaments")

  const client = await clerkClient()
  const { data } = await client.users.getUserList({ limit: 100, orderBy: "-created_at" })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Users</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Manage who can administer tournaments. Promote players to admin or demote admins to player.
        </p>
      </div>

      <Separator />

      <Card>
        <CardContent className="p-0">
          <ul className="divide-y">
            {data.map((u) => {
              const email = u.primaryEmailAddress?.emailAddress ?? "—"
              const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || email
              const role = ((u.publicMetadata?.role as string | undefined) ?? "PLAYER") as "ADMIN" | "PLAYER"
              const isSelf = u.id === current.userId
              return (
                <li key={u.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{name}</p>
                      {isSelf && (
                        <Badge variant="outline" className="text-[10px]">
                          You
                        </Badge>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{email}</p>
                  </div>
                  <UserRoleToggle userId={u.id} initialRole={role} isSelf={isSelf} />
                </li>
              )
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

export const dynamic = "force-dynamic"
