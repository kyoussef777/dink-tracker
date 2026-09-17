import { clerkClient } from "@clerk/nextjs/server"
import { requireAdmin } from "@/lib/auth"

type Params = { params: Promise<{ id: string }> }

export async function DELETE(_req: Request, { params }: Params) {
  const userId = await requireAdmin()
  if (userId instanceof Response) return userId

  const { id } = await params
  const client = await clerkClient()
  try {
    await client.invitations.revokeInvitation(id)
  } catch {
    return Response.json({ error: "Failed to revoke invitation" }, { status: 400 })
  }
  return Response.json({ data: { id } })
}
