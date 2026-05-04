import { z } from "zod"
import { parseBody } from "@/lib/api"
import { requireAdmin, setUserRole } from "@/lib/auth"

const RoleSchema = z.object({ role: z.enum(["ADMIN", "PLAYER"]) })

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const userId = await requireAdmin()
  if (userId instanceof Response) return userId

  const body = await parseBody(req, RoleSchema)
  if (body instanceof Response) return body

  const { id } = await params
  if (id === userId && body.role !== "ADMIN") {
    return Response.json({ error: "You cannot demote yourself" }, { status: 400 })
  }

  await setUserRole(id, body.role)
  return Response.json({ data: { id, role: body.role } })
}
