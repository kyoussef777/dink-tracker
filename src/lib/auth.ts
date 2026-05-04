import { auth, clerkClient } from "@clerk/nextjs/server"

export type Role = "ADMIN" | "PLAYER"

const adminAllowlist = (): Set<string> =>
  new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  )

export function isAllowlistAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  return adminAllowlist().has(email.toLowerCase())
}

/** Resolve the signed-in user's role. Lazy-promotes to ADMIN if their email is in ADMIN_EMAILS. */
export async function getCurrentRole(): Promise<{ userId: string; role: Role } | null> {
  const { userId } = await auth()
  if (!userId) return null

  const client = await clerkClient()
  const user = await client.users.getUser(userId)
  const stored = (user.publicMetadata?.role as Role | undefined) ?? null

  if (stored === "ADMIN" || stored === "PLAYER") return { userId, role: stored }

  const email = user.primaryEmailAddress?.emailAddress
  const role: Role = isAllowlistAdmin(email) ? "ADMIN" : "PLAYER"
  await client.users.updateUserMetadata(userId, { publicMetadata: { role } })
  return { userId, role }
}

/** Returns userId, or a Response (401/403). */
export async function requireAdmin(): Promise<string | Response> {
  const current = await getCurrentRole()
  if (!current) return Response.json({ error: "Unauthorized" }, { status: 401 })
  if (current.role !== "ADMIN") return Response.json({ error: "Forbidden" }, { status: 403 })
  return current.userId
}

/** Sets the role on a Clerk user. Used by the webhook + admin UI. */
export async function setUserRole(userId: string, role: Role): Promise<void> {
  const client = await clerkClient()
  await client.users.updateUserMetadata(userId, { publicMetadata: { role } })
}
