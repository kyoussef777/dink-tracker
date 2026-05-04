import { db } from "@/lib/db"

/** Auto-link Player rows whose email matches the current user. Idempotent; safe to call on every page load. */
export async function autoLinkPlayersByEmail(userId: string, email: string | null): Promise<void> {
  if (!email) return
  await db.player.updateMany({
    where: { email: { equals: email, mode: "insensitive" }, userId: null },
    data: { userId },
  })
}
