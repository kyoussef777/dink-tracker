import type { Match, Team } from "@prisma/client"

type MatchWithTeams = Match & { team1: Team | null; team2: Team | null }

export type StandingRow = {
  team: Team
  played: number
  wins: number
  losses: number
  gamesWon: number
  gamesLost: number
  pointsFor: number
  pointsAgainst: number
  pointDiff: number
  rank: number
}

export function computeStandings(teams: Team[], matches: MatchWithTeams[]): StandingRow[] {
  const stats = new Map<string, Omit<StandingRow, "rank">>()
  for (const t of teams) {
    stats.set(t.id, {
      team: t,
      played: 0,
      wins: 0,
      losses: 0,
      gamesWon: 0,
      gamesLost: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pointDiff: 0,
    })
  }

  for (const m of matches) {
    if (m.status !== "COMPLETED") continue
    if (!m.team1Id || !m.team2Id) continue
    const a = stats.get(m.team1Id)
    const b = stats.get(m.team2Id)
    if (!a || !b) continue

    a.played++
    b.played++
    let aGames = 0
    let bGames = 0
    let aPoints = 0
    let bPoints = 0
    for (let i = 0; i < Math.max(m.score1.length, m.score2.length); i++) {
      const s1 = m.score1[i] ?? 0
      const s2 = m.score2[i] ?? 0
      aPoints += s1
      bPoints += s2
      if (s1 > s2) aGames++
      else if (s2 > s1) bGames++
    }
    a.gamesWon += aGames
    a.gamesLost += bGames
    b.gamesWon += bGames
    b.gamesLost += aGames
    a.pointsFor += aPoints
    a.pointsAgainst += bPoints
    b.pointsFor += bPoints
    b.pointsAgainst += aPoints
    a.pointDiff = a.pointsFor - a.pointsAgainst
    b.pointDiff = b.pointsFor - b.pointsAgainst
    if (m.winnerId === m.team1Id) {
      a.wins++
      b.losses++
    } else if (m.winnerId === m.team2Id) {
      b.wins++
      a.losses++
    }
  }

  const rows = [...stats.values()].sort((x, y) => {
    if (y.wins !== x.wins) return y.wins - x.wins
    if (y.pointDiff !== x.pointDiff) return y.pointDiff - x.pointDiff
    if (y.gamesWon - y.gamesLost !== x.gamesWon - x.gamesLost) {
      return y.gamesWon - y.gamesLost - (x.gamesWon - x.gamesLost)
    }
    return x.team.name.localeCompare(y.team.name)
  })

  return rows.map((r, i) => ({ ...r, rank: i + 1 }))
}
