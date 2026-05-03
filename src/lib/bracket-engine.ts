export type BracketMatch = {
  position: number
  round: number
  team1Seed: number | null
  team2Seed: number | null
  fromMatch1Pos?: number
  fromMatch2Pos?: number
}

export type GeneratedBracket = {
  matches: BracketMatch[]
  totalRounds: number
  hasByes: boolean
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

export function advanceWinner(
  completedMatchPos: number,
  winningSeed: number,
  allMatches: BracketMatch[]
): BracketMatch[] {
  return allMatches.map((m) => {
    if (m.fromMatch1Pos === completedMatchPos) return { ...m, team1Seed: winningSeed }
    if (m.fromMatch2Pos === completedMatchPos) return { ...m, team2Seed: winningSeed }
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
