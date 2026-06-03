import { db } from "@/lib/db"
import { generateBracket, buildMatchRows } from "@/lib/bracket-engine"

export type BracketResetOutcome =
  | { status: "rebuilt"; matchCount: number; rounds: number }
  | { status: "too_few" }
  | { status: "invalid"; error: string }

/**
 * Reset a single bracket to its first round: delete all matches (and the scores,
 * winners, and progress they hold) and rebuild the draw from the bracket's
 * current teams in seed order. Teams and players are preserved untouched.
 *
 * Shared by the bracket "regenerate" action and the tournament-wide reset. Pure
 * data work — callers own auth checks and Pusher broadcasts.
 */
export async function resetBracket(bracketId: string): Promise<BracketResetOutcome> {
  const bracket = await db.bracket.findUnique({
    where: { id: bracketId },
    include: { teams: { orderBy: [{ seed: "asc" }, { id: "asc" }] } },
  })
  if (!bracket) return { status: "invalid", error: "Bracket not found" }
  if (bracket.teams.length < 2) return { status: "too_few" }

  if (bracket.format === "DOUBLE_ELIMINATION") {
    const n = bracket.teams.length
    if (n < 4 || (n & (n - 1)) !== 0 || n > 32) {
      return { status: "invalid", error: "Double elimination needs a power-of-2 team count (4, 8, 16, or 32)." }
    }
  }

  const generated = generateBracket(bracket.format, bracket.teams.length)
  // Normalize seeds to 1..N in current order so the engine's seed map lines up.
  const seedToTeamId = new Map(bracket.teams.map((t, i) => [i + 1, t.id]))

  await db.$transaction([
    db.match.deleteMany({ where: { bracketId } }),
    ...bracket.teams.map((t, i) => db.team.update({ where: { id: t.id }, data: { seed: i + 1 } })),
    db.match.createMany({ data: buildMatchRows(generated, bracketId, seedToTeamId) }),
    db.bracket.update({
      where: { id: bracketId },
      data: { rounds: generated.totalRounds, status: "ACTIVE" },
    }),
  ])

  return { status: "rebuilt", matchCount: generated.matches.length, rounds: generated.totalRounds }
}
