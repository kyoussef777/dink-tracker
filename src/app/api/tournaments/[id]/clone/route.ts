import { db } from "@/lib/db"
import { parseBody } from "@/lib/api"
import { requireAdmin } from "@/lib/auth"
import { TournamentCloneSchema } from "@/lib/validators"
import type { MatchStatus } from "@prisma/client"

type Params = { params: Promise<{ id: string }> }

/**
 * Deep-clone a tournament — its brackets, teams, players, draws, and entries —
 * into a brand-new tournament. Intended for admins to spin up a throwaway copy
 * for testing without touching the original.
 *
 * The copy starts in DRAFT regardless of the source status. When
 * `includeResults` is false, the bracket structure (matches and their wiring)
 * is preserved but every score, winner, court, and progress flag is reset so
 * the draw is ready to be played from scratch. Admin only.
 */
export async function POST(req: Request, { params }: Params) {
  const userId = await requireAdmin()
  if (userId instanceof Response) return userId

  const { id } = await params
  const body = await parseBody(req, TournamentCloneSchema)
  if (body instanceof Response) return body
  const includeResults = body.includeResults ?? true

  const source = await db.tournament.findUnique({
    where: { id },
    include: {
      entries: true,
      brackets: {
        include: {
          teams: { include: { players: true } },
          matches: true,
        },
      },
    },
  })
  if (!source) return Response.json({ error: "Not found" }, { status: 404 })

  const name = body.name?.trim() || `Copy of ${source.name}`

  const created = await db.$transaction(
    async (tx) => {
      const tournament = await tx.tournament.create({
        data: {
          name,
          venue: source.venue,
          startDate: source.startDate,
          endDate: source.endDate,
          // A clone is always a fresh draft so it can't be mistaken for live play.
          status: "DRAFT",
          description: source.description,
          courtNames: source.courtNames,
          createdBy: userId,
        },
      })

      for (const bracket of source.brackets) {
        const newBracket = await tx.bracket.create({
          data: {
            tournamentId: tournament.id,
            skillLevel: bracket.skillLevel,
            format: bracket.format,
            // Results aside, a copied bracket hasn't been played yet.
            status: includeResults ? bracket.status : "PENDING",
            rounds: bracket.rounds,
            maxActiveMatches: bracket.maxActiveMatches,
          },
        })

        // Recreate teams (with their players) and remember how old team ids map
        // to the freshly-created ones, so match references can be rewired.
        const teamIdMap = new Map<string, string>()
        for (const team of bracket.teams) {
          const newTeam = await tx.team.create({
            data: {
              bracketId: newBracket.id,
              name: team.name,
              seed: team.seed,
              players: {
                create: team.players.map((p) => ({
                  name: p.name,
                  rating: p.rating,
                  email: p.email,
                  phone: p.phone,
                  userId: p.userId,
                })),
              },
            },
          })
          teamIdMap.set(team.id, newTeam.id)
        }

        if (bracket.matches.length > 0) {
          await tx.match.createMany({
            data: bracket.matches.map((m) => {
              const team1Id = m.team1Id ? teamIdMap.get(m.team1Id) ?? null : null
              const team2Id = m.team2Id ? teamIdMap.get(m.team2Id) ?? null : null
              const winnerId =
                includeResults && m.winnerId ? teamIdMap.get(m.winnerId) ?? null : null
              const status: MatchStatus = includeResults
                ? m.status
                : m.status === "BYE"
                  ? "BYE"
                  : "PENDING"
              return {
                bracketId: newBracket.id,
                round: m.round,
                position: m.position,
                team1Id,
                team2Id,
                winnerId,
                score1: includeResults ? m.score1 : [],
                score2: includeResults ? m.score2 : [],
                court: includeResults ? m.court : null,
                status,
                bracketSide: m.bracketSide,
                // Draw wiring is by stable position, so it copies verbatim.
                fromMatch1Pos: m.fromMatch1Pos,
                fromMatch2Pos: m.fromMatch2Pos,
                fromMatch1IsLoser: m.fromMatch1IsLoser,
                fromMatch2IsLoser: m.fromMatch2IsLoser,
                scheduledAt: includeResults ? m.scheduledAt : null,
                completedAt: includeResults ? m.completedAt : null,
              }
            }),
          })
        }
      }

      if (source.entries.length > 0) {
        await tx.playerEntry.createMany({
          data: source.entries.map((e) => ({
            tournamentId: tournament.id,
            name: e.name,
            rating: e.rating,
            email: e.email,
          })),
        })
      }

      return tournament
    },
    { timeout: 30_000 }
  )

  return Response.json({ data: created }, { status: 201 })
}
