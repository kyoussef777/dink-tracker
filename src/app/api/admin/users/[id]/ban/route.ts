import { requireAdmin, setUserBanned } from "@/lib/auth"

type Params = { params: Promise<{ id: string }> }

export async function POST(_req: Request, { params }: Params) {
  const userId = await requireAdmin()
  if (userId instanceof Response) return userId

  const { id } = await params
  if (id === userId) return Response.json({ error: "You cannot ban yourself" }, { status: 400 })

  await setUserBanned(id, true)
  return Response.json({ data: { id, banned: true } })
}

export async function DELETE(_req: Request, { params }: Params) {
  const userId = await requireAdmin()
  if (userId instanceof Response) return userId

  const { id } = await params
  await setUserBanned(id, false)
  return Response.json({ data: { id, banned: false } })
}
