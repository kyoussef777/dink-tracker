import { z } from "zod"

export const TournamentCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  venue: z.string().max(200).optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  description: z.string().max(1000).optional(),
  courtNames: z.array(z.string().min(1).max(50)).max(64).optional(),
})

export const TournamentUpdateSchema = TournamentCreateSchema.partial().extend({
  status: z.enum(["DRAFT", "REGISTRATION", "ACTIVE", "COMPLETED", "CANCELLED"]).optional(),
})

export const BracketCreateSchema = z.object({
  tournamentId: z.string().cuid(),
  skillLevel: z.string().min(1, "Skill level is required").max(20),
  format: z.enum(["SINGLE_ELIMINATION", "DOUBLE_ELIMINATION", "ROUND_ROBIN"]),
})

export const TeamCreateSchema = z.object({
  bracketId: z.string().cuid(),
  name: z.string().min(1).max(100),
  seed: z.number().int().positive().optional(),
  players: z
    .array(z.object({ name: z.string().min(1).max(100), rating: z.number().min(0).max(6).optional(), email: z.string().email().optional() }))
    .min(1)
    .max(4),
})

export const MatchUpdateSchema = z.object({
  score1: z.array(z.number().int().min(0)).optional(),
  score2: z.array(z.number().int().min(0)).optional(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "BYE"]).optional(),
  court: z.string().max(50).nullable().optional(),
  // null clears the slot/winner; admins can reassign teams or reopen a match.
  winnerId: z.string().cuid().nullable().optional(),
  team1Id: z.string().cuid().nullable().optional(),
  team2Id: z.string().cuid().nullable().optional(),
  // Admin round editing: move a match to a different round.
  round: z.number().int().min(1).max(64).optional(),
})

export const BracketUpdateSchema = z.object({
  skillLevel: z.string().min(1).max(20).optional(),
  // Wave cap: how many matches may be live at once. 0 = unlimited.
  maxActiveMatches: z.number().int().min(0).max(64).optional(),
})

export const TeamUpdateSchema = z.object({
  name: z.string().min(1, "Team name is required").max(100).optional(),
  seed: z.number().int().positive().nullable().optional(),
  players: z
    .array(
      z.object({
        name: z.string().min(1, "Player name is required").max(100),
        rating: z.number().min(0).max(7).optional(),
        email: z.string().email().optional().or(z.literal("")),
        phone: z.string().max(30).optional().or(z.literal("")),
      })
    )
    .min(1)
    .max(4)
    .optional(),
})

export const PlayerSearchSchema = z.object({
  q: z.string().min(1).max(100),
  tournamentId: z.string().cuid().optional(),
})

export const NotifyPlayersSchema = z.object({
  message: z.string().min(1, "Message is required").max(1000),
})

export type TournamentCreate = z.infer<typeof TournamentCreateSchema>
export type TournamentUpdate = z.infer<typeof TournamentUpdateSchema>
export type BracketCreate = z.infer<typeof BracketCreateSchema>
export type TeamCreate = z.infer<typeof TeamCreateSchema>
export type TeamUpdate = z.infer<typeof TeamUpdateSchema>
export type MatchUpdate = z.infer<typeof MatchUpdateSchema>
export type BracketUpdate = z.infer<typeof BracketUpdateSchema>
export type NotifyPlayers = z.infer<typeof NotifyPlayersSchema>
