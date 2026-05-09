export type BracketSide = "WINNERS" | "LOSERS" | "GRAND_FINAL"

export type BracketMatch = {
  position: number
  round: number
  team1Seed: number | null
  team2Seed: number | null
  fromMatch1Pos?: number
  fromMatch2Pos?: number
  fromMatch1IsLoser?: boolean
  fromMatch2IsLoser?: boolean
  bracketSide?: BracketSide
}

export type GeneratedBracket = {
  matches: BracketMatch[]
  totalRounds: number
  hasByes: boolean
}

export function generateBracket(format: string, teamCount: number): GeneratedBracket {
  switch (format) {
    case "ROUND_ROBIN":
      return generateRoundRobin(teamCount)
    case "DOUBLE_ELIMINATION":
      return generateDoubleElimination(teamCount)
    case "SINGLE_ELIMINATION":
    default:
      return generateSingleElimination(teamCount)
  }
}

export function generateSingleElimination(teamCount: number): GeneratedBracket {
  if (teamCount < 2) throw new Error("Need at least 2 teams")

  const size = nextPowerOf2(teamCount)
  const totalRounds = Math.log2(size)
  const hasByes = size > teamCount

  const firstRoundPairs = seededPairs(size)
  const matches: BracketMatch[] = []
  let pos = 1

  for (const [s1, s2] of firstRoundPairs) {
    matches.push({
      position: pos++,
      round: 1,
      bracketSide: "WINNERS",
      team1Seed: s1 <= teamCount ? s1 : null,
      team2Seed: s2 <= teamCount ? s2 : null,
    })
  }

  for (let r = 2; r <= totalRounds; r++) {
    const matchesInRound = size / Math.pow(2, r)
    const prevStart = pos - matchesInRound * 2
    for (let i = 0; i < matchesInRound; i++) {
      matches.push({
        position: pos++,
        round: r,
        bracketSide: "WINNERS",
        team1Seed: null,
        team2Seed: null,
        fromMatch1Pos: prevStart + i * 2,
        fromMatch2Pos: prevStart + i * 2 + 1,
      })
    }
  }

  return { matches, totalRounds, hasByes }
}

export function generateRoundRobin(teamCount: number): GeneratedBracket {
  if (teamCount < 2) throw new Error("Need at least 2 teams")

  const seeds = Array.from({ length: teamCount }, (_, i) => i + 1)
  if (seeds.length % 2 !== 0) seeds.push(0)
  const n = seeds.length
  const totalRounds = n - 1
  const matches: BracketMatch[] = []
  let pos = 1

  const rotation = [...seeds]
  for (let r = 0; r < totalRounds; r++) {
    for (let i = 0; i < n / 2; i++) {
      const s1 = rotation[i]
      const s2 = rotation[n - 1 - i]
      if (s1 !== 0 && s2 !== 0) {
        matches.push({ position: pos++, round: r + 1, team1Seed: s1, team2Seed: s2 })
      }
    }
    rotation.splice(1, 0, rotation.pop()!)
  }

  return { matches, totalRounds, hasByes: teamCount % 2 !== 0 }
}

/**
 * Standard double-elimination bracket. Requires teamCount to be a power of 2 (4/8/16/32).
 *
 * Layout:
 *   - Winners bracket: rounds 1..W (single-elim shape)
 *   - Losers bracket: rounds W+1..W+(2W-2). Alternates drop-in and internal rounds.
 *   - Grand final: round W+(2W-2)+1. WB winner vs LB winner. (No bracket reset.)
 *
 * Each LB round drains losers from a corresponding WB round; the LB final pulls
 * the loser of the WB final.
 */
export function generateDoubleElimination(teamCount: number): GeneratedBracket {
  if (teamCount < 4) throw new Error("Double elimination needs at least 4 teams")
  if ((teamCount & (teamCount - 1)) !== 0) {
    throw new Error("Double elimination team count must be a power of 2 (4, 8, 16, or 32)")
  }
  if (teamCount > 32) throw new Error("Double elimination is capped at 32 teams")

  const K = teamCount
  const W = Math.log2(K)
  const LB_ROUNDS = 2 * W - 2

  const matches: BracketMatch[] = []
  let pos = 1

  // ---- Winners Bracket ----
  const wbRoundStart: number[] = []
  const wbRoundSize: number[] = []

  wbRoundStart[1] = pos
  wbRoundSize[1] = K / 2
  for (const [s1, s2] of seededPairs(K)) {
    matches.push({
      position: pos++,
      round: 1,
      bracketSide: "WINNERS",
      team1Seed: s1,
      team2Seed: s2,
    })
  }

  for (let r = 2; r <= W; r++) {
    wbRoundStart[r] = pos
    wbRoundSize[r] = K / Math.pow(2, r)
    for (let i = 0; i < wbRoundSize[r]; i++) {
      matches.push({
        position: pos++,
        round: r,
        bracketSide: "WINNERS",
        team1Seed: null,
        team2Seed: null,
        fromMatch1Pos: wbRoundStart[r - 1] + i * 2,
        fromMatch2Pos: wbRoundStart[r - 1] + i * 2 + 1,
      })
    }
  }

  // ---- Losers Bracket ----
  const lbRoundStart: number[] = []
  const lbRoundSize: number[] = []

  // LR1: pair WR1 losers with each other.
  lbRoundStart[1] = pos
  lbRoundSize[1] = K / 4
  for (let i = 0; i < lbRoundSize[1]; i++) {
    matches.push({
      position: pos++,
      round: W + 1,
      bracketSide: "LOSERS",
      team1Seed: null,
      team2Seed: null,
      fromMatch1Pos: wbRoundStart[1] + i * 2,
      fromMatch1IsLoser: true,
      fromMatch2Pos: wbRoundStart[1] + i * 2 + 1,
      fromMatch2IsLoser: true,
    })
  }

  for (let lbR = 2; lbR <= LB_ROUNDS; lbR++) {
    lbRoundStart[lbR] = pos
    if (lbR % 2 === 0) {
      // Drop-in round: each match pairs an LR(lbR-1) winner with a WR(lbR/2 + 1) loser.
      const wbSrc = lbR / 2 + 1
      lbRoundSize[lbR] = wbRoundSize[wbSrc]
      for (let i = 0; i < lbRoundSize[lbR]; i++) {
        matches.push({
          position: pos++,
          round: W + lbR,
          bracketSide: "LOSERS",
          team1Seed: null,
          team2Seed: null,
          fromMatch1Pos: lbRoundStart[lbR - 1] + i,
          fromMatch2Pos: wbRoundStart[wbSrc] + i,
          fromMatch2IsLoser: true,
        })
      }
    } else {
      // Internal round: pair LR(lbR-1) winners.
      lbRoundSize[lbR] = lbRoundSize[lbR - 1] / 2
      for (let i = 0; i < lbRoundSize[lbR]; i++) {
        matches.push({
          position: pos++,
          round: W + lbR,
          bracketSide: "LOSERS",
          team1Seed: null,
          team2Seed: null,
          fromMatch1Pos: lbRoundStart[lbR - 1] + i * 2,
          fromMatch2Pos: lbRoundStart[lbR - 1] + i * 2 + 1,
        })
      }
    }
  }

  // ---- Grand Final ----
  matches.push({
    position: pos++,
    round: W + LB_ROUNDS + 1,
    bracketSide: "GRAND_FINAL",
    team1Seed: null,
    team2Seed: null,
    fromMatch1Pos: wbRoundStart[W],
    fromMatch2Pos: lbRoundStart[LB_ROUNDS],
  })

  return { matches, totalRounds: W + LB_ROUNDS + 1, hasByes: false }
}

export function advanceWinner(
  completedMatchPos: number,
  winningSeed: number,
  allMatches: BracketMatch[]
): BracketMatch[] {
  return allMatches.map((m) => {
    if (m.fromMatch1Pos === completedMatchPos && !m.fromMatch1IsLoser) return { ...m, team1Seed: winningSeed }
    if (m.fromMatch2Pos === completedMatchPos && !m.fromMatch2IsLoser) return { ...m, team2Seed: winningSeed }
    return m
  })
}

function nextPowerOf2(n: number): number {
  return Math.pow(2, Math.ceil(Math.log2(n)))
}

function seededPairs(size: number): [number, number][] {
  if (size === 2) return [[1, 2]]
  const half = seededPairs(size / 2)
  return half.flatMap(([a, b]) => [
    [a, size + 1 - a],
    [b, size + 1 - b],
  ]) as [number, number][]
}
