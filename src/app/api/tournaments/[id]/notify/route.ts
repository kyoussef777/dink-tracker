import { db } from "@/lib/db"
import { parseBody } from "@/lib/api"
import { requireAdmin } from "@/lib/auth"
import { NotifyPlayersSchema } from "@/lib/validators"
import { sendBulkSms, isSmsConfigured } from "@/lib/sms"

type Params = { params: Promise<{ id: string }> }

/** Mass-text every player with a phone number in this tournament. Admin only. */
export async function POST(req: Request, { params }: Params) {
  const userId = await requireAdmin()
  if (userId instanceof Response) return userId

  const { id } = await params
  const data = await parseBody(req, NotifyPlayersSchema)
  if (data instanceof Response) return data

  if (!isSmsConfigured()) {
    return Response.json(
      { error: "SMS is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM." },
      { status: 503 }
    )
  }

  const tournament = await db.tournament.findFirst({
    where: { id },
    select: { id: true },
  })
  if (!tournament) return Response.json({ error: "Not found" }, { status: 404 })

  const players = await db.player.findMany({
    where: { team: { bracket: { tournamentId: id } }, phone: { not: null } },
    select: { phone: true },
  })

  if (players.length === 0) {
    return Response.json(
      { error: "No players with phone numbers in this tournament." },
      { status: 400 }
    )
  }

  const result = await sendBulkSms(
    players.map((p) => p.phone),
    data.message
  )

  return Response.json({ data: result })
}
