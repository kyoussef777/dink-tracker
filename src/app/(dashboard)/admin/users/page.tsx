import { redirect } from "next/navigation"
import { clerkClient } from "@clerk/nextjs/server"
import { getCurrentRole } from "@/lib/auth"
import { db } from "@/lib/db"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { UserRoleToggle } from "@/components/admin/UserRoleToggle"
import { UserRowActions } from "@/components/admin/UserRowActions"
import { UserFilters } from "@/components/admin/UserFilters"
import { UserPagination } from "@/components/admin/UserPagination"
import { InviteUserDialog } from "@/components/admin/InviteUserDialog"
import { PendingInvitations, type PendingInvitation } from "@/components/admin/PendingInvitations"
import { EmptyState } from "@/components/shared/EmptyState"
import { formatDate } from "@/lib/utils"

const PAGE_SIZE = 20

type SearchParams = { q?: string; role?: string; status?: string; page?: string }

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const current = await getCurrentRole()
  if (!current) redirect("/sign-in")
  if (current.role !== "ADMIN") redirect("/tournaments")

  const sp = await searchParams
  const q = sp.q?.trim() ?? ""
  const roleFilter = sp.role === "ADMIN" || sp.role === "PLAYER" ? sp.role : "ALL"
  const statusFilter = sp.status === "BANNED" || sp.status === "ACTIVE" ? sp.status : "ALL"
  const page = Math.max(1, Number(sp.page) || 1)

  const client = await clerkClient()
  const [{ data: allUsers }, { data: invitationList }] = await Promise.all([
    client.users.getUserList({ limit: 500, orderBy: "-created_at", query: q || undefined }),
    client.invitations.getInvitationList({ status: "pending", limit: 100 }),
  ])

  const totalAdmins = allUsers.filter((u) => (u.publicMetadata?.role as string | undefined) === "ADMIN").length
  const totalBanned = allUsers.filter((u) => u.banned).length

  const filtered = allUsers.filter((u) => {
    const role = ((u.publicMetadata?.role as string | undefined) ?? "PLAYER") as "ADMIN" | "PLAYER"
    if (roleFilter !== "ALL" && role !== roleFilter) return false
    if (statusFilter === "BANNED" && !u.banned) return false
    if (statusFilter === "ACTIVE" && u.banned) return false
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const clampedPage = Math.min(page, totalPages)
  const pageUsers = filtered.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE)

  // Players are linked to a Clerk userId by email (see lib/player-link.ts); surface
  // that here so an admin can see which accounts have skin in an actual tournament.
  const linkedCounts = pageUsers.length
    ? await db.player.groupBy({
        by: ["userId"],
        where: { userId: { in: pageUsers.map((u) => u.id) } },
        _count: { _all: true },
      })
    : []
  const linkedByUser = new Map(linkedCounts.map((c) => [c.userId, c._count._all]))

  const invitations: PendingInvitation[] = invitationList.map((inv) => ({
    id: inv.id,
    emailAddress: inv.emailAddress,
    role: (inv.publicMetadata?.role as string | undefined) === "ADMIN" ? "ADMIN" : "PLAYER",
    createdAt: inv.createdAt,
  }))

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Users</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {allUsers.length} {allUsers.length === 1 ? "user" : "users"} · {totalAdmins}{" "}
            {totalAdmins === 1 ? "admin" : "admins"}
            {totalBanned > 0 && ` · ${totalBanned} banned`}
          </p>
        </div>
        <InviteUserDialog />
      </div>

      <PendingInvitations invitations={invitations} />

      <Separator />

      <UserFilters initialQuery={q} initialRole={roleFilter} initialStatus={statusFilter} />

      {filtered.length === 0 ? (
        <EmptyState title="No matching users" description="No users match the current filters. Try clearing them." />
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y">
                {pageUsers.map((u) => {
                  const email = u.primaryEmailAddress?.emailAddress ?? "—"
                  const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || email
                  const role = ((u.publicMetadata?.role as string | undefined) ?? "PLAYER") as "ADMIN" | "PLAYER"
                  const isSelf = u.id === current.userId
                  const linked = linkedByUser.get(u.id) ?? 0
                  return (
                    <li key={u.id} className="flex items-center justify-between gap-4 px-4 py-3">
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-medium">{name}</p>
                          {isSelf && (
                            <Badge variant="outline" className="text-[10px]">
                              You
                            </Badge>
                          )}
                          {u.banned && (
                            <Badge variant="destructive" className="text-[10px]">
                              Banned
                            </Badge>
                          )}
                          {linked > 0 && (
                            <Badge variant="secondary" className="text-[10px]">
                              {linked} player {linked === 1 ? "profile" : "profiles"}
                            </Badge>
                          )}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {email} · joined {formatDate(new Date(u.createdAt))}
                          {u.lastActiveAt ? ` · active ${formatDate(new Date(u.lastActiveAt))}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <UserRoleToggle userId={u.id} initialRole={role} isSelf={isSelf} />
                        <UserRowActions userId={u.id} name={name} banned={u.banned} isSelf={isSelf} />
                      </div>
                    </li>
                  )
                })}
              </ul>
            </CardContent>
          </Card>

          <UserPagination page={clampedPage} totalPages={totalPages} />
        </>
      )}
    </div>
  )
}

export const dynamic = "force-dynamic"
