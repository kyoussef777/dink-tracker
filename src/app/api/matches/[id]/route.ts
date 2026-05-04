import { db } from "@/lib/db"
import { parseBody } from "@/lib/api"
import { requireAdmin } from "@/lib/auth"
import { MatchUpdateSchema } from "@/lib/validators"
import { pusherServer } from "@/lib/pusher"
import type { Prisma } from "@prisma/client"

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const userId = await requireAdmin()
  if (userId instanceof Response) return userId

  const { id } = await params
  const data = await parseBody(req, MatchUpdateSchema)
  if (data instanceof Response) return data

  const match = await db.match.findFirst({
    where: { id, bracket: { tournament: { createdBy: userId } } },
    include: { bracket: { select: { id: true, tournamentId: true } } },
  })
  if (!match) return Response.json({ error: "Not found" }, { status: 404 })

  const score1 = data.score1 ?? match.score1
  const score2 = data.score2 ?? match.score2
  const winnerId = computeWinner(score1, score2, match.team1Id, match.team2Id, data.winnerId)

  let nextStatus = data.status
  if (!nextStatus) {
    if (winnerId) nextStatus = "COMPLETED"
    else if (score1.length > 0 || score2.length > 0) nextStatus = "IN_PROGRESS"
  }

  const courtPatch =
    data.court === undefined ? match.court : data.court === "" || data.court === null ? null : data.court

  const updateData: Prisma.MatchUpdateInput = {
    score1,
    score2,
    court: courtPatch,
    status: nextStatus ?? match.status,
    winner: winnerId ? { connect: { id: winnerId } } : { disconnect: true },
    completedAt: nextStatus === "COMPLETED" ? new Date() : null,
  }

  const updated = await db.match.update({
    where: { id },
    data: updateData,
    include: { team1: true, team2: true, winner: true },
  })

  let advanced = false
  if (winnerId) {
    advanced = await advanceWinnerInDb(match.bracket.id, match.position, winnerId)
    await maybeCompleteBracket(match.bracket.id)
  }

  await pusherServer
    .trigger(`tournament-${match.bracket.tournamentId}`, "match-updated", {
      bracketId: match.bracket.id,
      matchId: id,
    })
    .catch(() => {})
  if (advanced) {
    await pusherServer
      .trigger(`tournament-${match.bracket.tournamentId}`, "bracket-advanced", {
        bracketId: match.bracket.id,
      })
      .catch(() => {})
  }

  return Response.json({ data: updated })
}

function computeWinner(
  s1: number[],
  s2: number[],
  team1Id: string | null,
  team2Id: string | null,
  explicit?: string
): string | null {
  if (explicit) return explicit
  let g1 = 0
  let g2 = 0
  for (let i = 0; i < Math.max(s1.length, s2.length); i++) {
    const a = s1[i] ?? 0
    const b = s2[i] ?? 0
    if (a > b) g1++
    else if (b > a) g2++
  }
  const totalGames = Math.max(s1.length, s2.length)
  if (totalGames === 0) return null
  const remaining = totalGames - (g1 + g2)
  if (g1 > g2 + remaining && team1Id) return team1Id
  if (g2 > g1 + remaining && team2Id) return team2Id
  return null
}

async function advanceWinnerInDb(
  bracketId: string,
  completedPos: number,
  winnerId: string
): Promise<boolean> {
  const dependents = await db.match.findMany({
    where: {
      bracketId,
      OR: [{ fromMatch1Pos: completedPos }, { fromMatch2Pos: completedPos }],
    },
  })
  if (dependents.length === 0) return false

  await db.$transaction(
    dependents.map((dep) =>
      db.match.update({
        where: { id: dep.id },
        data:
          dep.fromMatch1Pos === completedPos
            ? { team1Id: winnerId }
            : { team2Id: winnerId },
      })
    )
  )
  return true
}

async function maybeCompleteBracket(bracketId: string) {
  const remaining = await db.match.count({
    where: { bracketId, status: { in: ["PENDING", "IN_PROGRESS"] } },
  })
  if (remaining === 0) {
    await db.bracket.update({ where: { id: bracketId }, data: { status: "COMPLETED" } })
  }
}
