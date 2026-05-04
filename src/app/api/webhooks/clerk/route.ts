import { Webhook } from "svix"
import { isAllowlistAdmin, setUserRole, type Role } from "@/lib/auth"
import { autoLinkPlayersByEmail } from "@/lib/player-link"

type ClerkUserPayload = {
  id: string
  email_addresses: { id: string; email_address: string }[]
  primary_email_address_id: string | null
  public_metadata: Record<string, unknown>
}

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET
  if (!secret) return Response.json({ error: "Webhook secret not configured" }, { status: 500 })

  const headers = {
    "svix-id": req.headers.get("svix-id") ?? "",
    "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
    "svix-signature": req.headers.get("svix-signature") ?? "",
  }
  if (!headers["svix-id"] || !headers["svix-signature"]) {
    return Response.json({ error: "Missing svix headers" }, { status: 400 })
  }

  const body = await req.text()
  let evt: { type: string; data: ClerkUserPayload }
  try {
    evt = new Webhook(secret).verify(body, headers) as { type: string; data: ClerkUserPayload }
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 401 })
  }

  if (evt.type !== "user.created" && evt.type !== "user.updated") {
    return Response.json({ ok: true })
  }

  const user = evt.data
  const email =
    user.email_addresses.find((e) => e.id === user.primary_email_address_id)?.email_address ?? null

  const existing = (user.public_metadata?.role as Role | undefined) ?? null
  const desired: Role = isAllowlistAdmin(email) ? "ADMIN" : existing ?? "PLAYER"
  if (existing !== desired) await setUserRole(user.id, desired)

  await autoLinkPlayersByEmail(user.id, email)

  return Response.json({ ok: true })
}
