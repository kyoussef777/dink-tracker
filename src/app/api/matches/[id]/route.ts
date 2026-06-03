import { db } from "@/lib/db"
import { parseBody } from "@/lib/api"
import { requireAdmin } from "@/lib/auth"
import { MatchUpdateSchema } from "@/lib/validators"
import { pusherServer } from "@/lib/pusher"
import { sendBulkSms, isSmsConfigured } from "@/lib/sms"
import type { Prisma } from "@prisma/client"

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const userId = await requireAdmin()
  if (userId instanceof Response) return userId

  const { id } = await params
  const data = await parseBody(req, MatchUpdateSchema)
  if (data instanceof Response) return data

  const match = await db.match.findFirst({
    where: { id },
    include: { bracket: { select: { id: true, tournamentId: true, maxActiveMatches: true } } },
  })
  if (!match) return Response.json({ error: "Not found" }, { status: 404 })

  // Admin team reassignment: move/swap a team into a slot, or clear it. Teams
  // must belong to this bracket. Reassigning teams clears any stale scores/winner.
  const team1Id = data.team1Id !== undefined ? data.team1Id : match.team1Id
  const team2Id = data.team2Id !== undefined ? data.team2Id : match.team2Id
  const teamsChanged = team1Id !== match.team1Id || team2Id !== match.team2Id

  if (teamsChanged) {
    const candidateIds = [team1Id, team2Id].filter((t): t is string => t !== null)
    if (candidateIds.length > 0) {
      const valid = await db.team.count({
        where: { id: { in: candidateIds }, bracketId: match.bracket.id },
      })
      if (valid !== new Set(candidateIds).size) {
        return Response.json({ error: "Team does not belong to this bracket" }, { status: 400 })
      }
    }
    if (team1Id && team1Id === team2Id) {
      return Response.json({ error: "A match needs two different teams" }, { status: 400 })
    }
  }

  // When teams change, drop prior scores/winner so the slot starts clean.
  const score1 = teamsChanged ? (data.score1 ?? []) : (data.score1 ?? match.score1)
  const score2 = teamsChanged ? (data.score2 ?? []) : (data.score2 ?? match.score2)

  // winnerId: a string sets it explicitly, null clears it (reopen), undefined
  // computes from scores. Teams changing also clears a now-invalid winner.
  let winnerId: string | null
  if (data.winnerId === null || teamsChanged) {
    winnerId = data.winnerId === null ? null : computeWinner(score1, score2, team1Id, team2Id)
  } else {
    winnerId = computeWinner(score1, score2, team1Id, team2Id, data.winnerId)
  }
  if (winnerId && winnerId !== team1Id && winnerId !== team2Id) {
    return Response.json({ error: "Winner must be one of the two teams" }, { status: 400 })
  }

  let nextStatus = data.status
  if (!nextStatus) {
    if (winnerId) nextStatus = "COMPLETED"
    else if (score1.length > 0 || score2.length > 0) nextStatus = "IN_PROGRESS"
    else if (teamsChanged) nextStatus = "PENDING"
  }

  // Wave/release cap: if the bracket limits concurrent live matches, block a
  // match that's newly going IN_PROGRESS once the cap is reached. Completing or
  // editing already-live matches is never blocked.
  const cap = match.bracket.maxActiveMatches
  const goingLive = nextStatus === "IN_PROGRESS" && match.status !== "IN_PROGRESS"
  if (cap > 0 && goingLive) {
    const liveCount = await db.match.count({
      where: { bracketId: match.bracket.id, status: "IN_PROGRESS" },
    })
    if (liveCount >= cap) {
      return Response.json(
        { error: `This bracket is capped at ${cap} live ${cap === 1 ? "match" : "matches"} at a time. Finish a live match first.` },
        { status: 409 }
      )
    }
  }

  const courtPatch =
    data.court === undefined ? match.court : data.court === "" || data.court === null ? null : data.court

  const updateData: Prisma.MatchUpdateInput = {
    team1: team1Id ? { connect: { id: team1Id } } : { disconnect: true },
    team2: team2Id ? { connect: { id: team2Id } } : { disconnect: true },
    score1,
    score2,
    court: courtPatch,
    status: nextStatus ?? match.status,
    winner: winnerId ? { connect: { id: winnerId } } : { disconnect: true },
    completedAt: nextStatus === "COMPLETED" ? new Date() : null,
    ...(data.round !== undefined ? { round: data.round } : {}),
  }

  const updated = await db.match.update({
    where: { id },
    data: updateData,
    include: { team1: true, team2: true, winner: true },
  })

  let advanced = false
  if (winnerId) {
    const loserId = winnerId === team1Id ? team2Id : winnerId === team2Id ? team1Id : null
    // If this match had already advanced a different winner (the winner was
    // changed, or the teams were swapped), pull the old winner — and anything
    // downstream of it — back out first. Otherwise a stale team lingers in later
    // rounds and dependent matches keep scores from the team that's no longer there.
    if (match.winnerId && match.winnerId !== winnerId) {
      await retractAdvancementInDb(match.bracket.id, match.position)
    }
    advanced = await advanceWinnerInDb(match.bracket.id, match.position, winnerId, loserId)
    await maybeCompleteBracket(match.bracket.id)
  } else if (match.winnerId) {
    // Winner was cleared (match reopened or teams changed): pull the old winner
    // back out of any dependent matches so the bracket stays consistent.
    await retractAdvancementInDb(match.bracket.id, match.position)
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

  // Alert players when their match is newly assigned to a court (court changed
  // to a non-empty value). Best-effort: never blocks or fails the response.
  const courtNewlyAssigned = courtPatch && courtPatch !== match.court
  if (courtNewlyAssigned && isSmsConfigured()) {
    const teamIds = [match.team1Id, match.team2Id].filter((t): t is string => t !== null)
    await notifyCourtAssignment(teamIds, courtPatch).catch(() => {})
  }

  return Response.json({ data: updated })
}

async function notifyCourtAssignment(teamIds: string[], court: string) {
  if (teamIds.length === 0) return
  const players = await db.player.findMany({
    where: { teamId: { in: teamIds }, phone: { not: null } },
    select: { phone: true },
  })
  if (players.length === 0) return
  await sendBulkSms(
    players.map((p) => p.phone),
    `You're up on ${court}. Please head to your court.`
  )
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
  winnerId: string,
  loserId: string | null
): Promise<boolean> {
  const dependents = await db.match.findMany({
    where: {
      bracketId,
      OR: [{ fromMatch1Pos: completedPos }, { fromMatch2Pos: completedPos }],
    },
  })
  if (dependents.length === 0) return false

  const updates: Prisma.PrismaPromise<unknown>[] = []
  for (const dep of dependents) {
    const slot1 = dep.fromMatch1Pos === completedPos
    const useLoser = slot1 ? dep.fromMatch1IsLoser : dep.fromMatch2IsLoser
    const teamId = useLoser ? loserId : winnerId
    if (!teamId) continue
    updates.push(
      db.match.update({
        where: { id: dep.id },
        data: slot1 ? { team1Id: teamId } : { team2Id: teamId },
      })
    )
  }
  if (updates.length === 0) return false
  await db.$transaction(updates)
  return true
}

/**
 * Reverse of advanceWinnerInDb: when a completed match is reopened, null out the
 * slots in dependent matches fed from this position so the bracket doesn't keep
 * a now-invalid team downstream. Recurses through the chain — a dependent that
 * had itself advanced a winner is reset and its own downstream cleared too.
 * Also reopens a COMPLETED bracket/tournament.
 */
async function retractAdvancementInDb(bracketId: string, completedPos: number) {
  const all = await db.match.findMany({
    where: { bracketId },
    select: { id: true, position: true, fromMatch1Pos: true, fromMatch2Pos: true, winnerId: true },
  })

  const updates: Prisma.PrismaPromise<unknown>[] = []
  const queue = [completedPos]
  const visited = new Set<number>()

  while (queue.length > 0) {
    const pos = queue.shift()!
    if (visited.has(pos)) continue
    visited.add(pos)

    for (const dep of all) {
      const slot1 = dep.fromMatch1Pos === pos
      const slot2 = dep.fromMatch2Pos === pos
      if (!slot1 && !slot2) continue
      updates.push(
        db.match.update({
          where: { id: dep.id },
          data: {
            ...(slot1 ? { team1Id: null } : { team2Id: null }),
            score1: [],
            score2: [],
            winnerId: null,
            status: "PENDING",
            completedAt: null,
          },
        })
      )
      // If this dependent had advanced its own winner, retract that too.
      if (dep.winnerId) queue.push(dep.position)
    }
  }
  if (updates.length > 0) await db.$transaction(updates)

  // If the bracket had been auto-completed, reopen it (and its tournament).
  const bracket = await db.bracket.findUnique({
    where: { id: bracketId },
    select: { status: true, tournamentId: true },
  })
  if (bracket?.status === "COMPLETED") {
    await db.bracket.update({ where: { id: bracketId }, data: { status: "ACTIVE" } })
    await db.tournament.updateMany({
      where: { id: bracket.tournamentId, status: "COMPLETED" },
      data: { status: "ACTIVE" },
    })
  }
}

async function maybeCompleteBracket(bracketId: string) {
  const remaining = await db.match.count({
    where: { bracketId, status: { in: ["PENDING", "IN_PROGRESS"] } },
  })
  if (remaining > 0) return

  const bracket = await db.bracket.update({
    where: { id: bracketId },
    data: { status: "COMPLETED" },
    select: { tournamentId: true },
  })

  const remainingBrackets = await db.bracket.count({
    where: { tournamentId: bracket.tournamentId, status: { not: "COMPLETED" } },
  })
  if (remainingBrackets === 0) {
    await db.tournament.update({
      where: { id: bracket.tournamentId },
      data: { status: "COMPLETED" },
    })
    await pusherServer
      .trigger(`tournament-${bracket.tournamentId}`, "tournament-status-changed", {})
      .catch(() => {})
  }
}
