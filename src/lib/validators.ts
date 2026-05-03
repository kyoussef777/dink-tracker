import { z } from "zod"

export const TournamentCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  venue: z.string().max(200).optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  description: z.string().max(1000).optional(),
})

export const TournamentUpdateSchema = TournamentCreateSchema.partial().extend({
  status: z.enum(["DRAFT", "REGISTRATION", "ACTIVE", "COMPLETED", "CANCELLED"]).optional(),
})

export const BracketCreateSchema = z.object({
  tournamentId: z.string().cuid(),
  skillLevel: z.string().min(1, "Skill level is required").max(20),
  format: z.enum(["SINGLE_ELIMINATION", "DOUBLE_ELIMINATION", "ROUND_ROBIN", "POOL_PLAY"]),
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
  court: z.string().max(50).optional(),
  winnerId: z.string().cuid().optional(),
})

export const PlayerSearchSchema = z.object({
  q: z.string().min(1).max(100),
  tournamentId: z.string().cuid().optional(),
})

export type TournamentCreate = z.infer<typeof TournamentCreateSchema>
export type TournamentUpdate = z.infer<typeof TournamentUpdateSchema>
export type BracketCreate = z.infer<typeof BracketCreateSchema>
export type TeamCreate = z.infer<typeof TeamCreateSchema>
export type MatchUpdate = z.infer<typeof MatchUpdateSchema>
