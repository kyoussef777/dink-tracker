import { clerkClient } from "@clerk/nextjs/server"
import { parseBody } from "@/lib/api"
import { requireAdmin } from "@/lib/auth"
import { UserInviteSchema } from "@/lib/validators"

/** Invites a new user by email, pre-assigning their role so it applies the moment they sign up. */
export async function POST(req: Request) {
  const userId = await requireAdmin()
  if (userId instanceof Response) return userId

  const body = await parseBody(req, UserInviteSchema)
  if (body instanceof Response) return body

  const client = await clerkClient()
  try {
    const invitation = await client.invitations.createInvitation({
      emailAddress: body.emailAddress,
      publicMetadata: { role: body.role },
      notify: true,
      ignoreExisting: true,
    })
    return Response.json({ data: invitation }, { status: 201 })
  } catch (err) {
    const message =
      err && typeof err === "object" && "errors" in err
        ? // Clerk backend errors carry a structured `errors[].message`.
          ((err as { errors?: { message?: string }[] }).errors?.[0]?.message ?? "Failed to send invitation")
        : "Failed to send invitation"
    return Response.json({ error: message }, { status: 400 })
  }
}
