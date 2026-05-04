import { clerkClient } from "@clerk/nextjs/server"
import { requireAdmin } from "@/lib/auth"

export async function GET() {
  const userId = await requireAdmin()
  if (userId instanceof Response) return userId

  const client = await clerkClient()
  const { data } = await client.users.getUserList({ limit: 100, orderBy: "-created_at" })

  const users = data.map((u) => ({
    id: u.id,
    email: u.primaryEmailAddress?.emailAddress ?? null,
    firstName: u.firstName,
    lastName: u.lastName,
    role: (u.publicMetadata?.role as string | undefined) ?? "PLAYER",
    createdAt: u.createdAt,
  }))

  return Response.json({ data: users })
}
