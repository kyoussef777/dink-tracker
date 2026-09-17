import { db } from "@/lib/db"
import { requireAdmin, deleteUserAccount } from "@/lib/auth"

type Params = { params: Promise<{ id: string }> }

/**
 * Permanently deletes a Clerk user. Any Player rows linked to this account
 * (via email auto-link) are unlinked first, since they reference the Clerk
 * userId directly with no foreign key. Admin only; cannot delete yourself.
 */
export async function DELETE(_req: Request, { params }: Params) {
  const userId = await requireAdmin()
  if (userId instanceof Response) return userId

  const { id } = await params
  if (id === userId) {
    return Response.json({ error: "You cannot delete your own account" }, { status: 400 })
  }

  await db.player.updateMany({ where: { userId: id }, data: { userId: null } })
  await deleteUserAccount(id)

  return Response.json({ data: { id } })
}
