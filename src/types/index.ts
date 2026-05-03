import type {
  Tournament,
  Bracket,
  Team,
  Match,
  Player,
  TournamentStatus,
  BracketFormat,
  BracketStatus,
  MatchStatus,
} from "@prisma/client"

export type {
  Tournament,
  Bracket,
  Team,
  Match,
  Player,
  TournamentStatus,
  BracketFormat,
  BracketStatus,
  MatchStatus,
}

export type TournamentWithBrackets = Tournament & {
  brackets: (Bracket & { teams: Team[] })[]
}

export type BracketWithDetails = Bracket & {
  teams: (Team & { players: Player[] })[]
  matches: MatchWithTeams[]
}

export type MatchWithTeams = Match & {
  team1: Team | null
  team2: Team | null
  winner: Team | null
}

export type TeamWithPlayers = Team & {
  players: Player[]
}

export type ApiResponse<T> = { data: T; error?: never } | { data?: never; error: string }
