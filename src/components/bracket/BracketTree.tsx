"use client"
import { useCallback, useLayoutEffect, useRef, useState } from "react"
import { EditableMatchCard } from "@/components/match/EditableMatchCard"
import { MatchCard } from "@/components/bracket/MatchCard"
import type { TeamOption } from "@/components/match/MatchEditDialog"
import type { Match, Team } from "@prisma/client"

type MatchWithTeams = Match & { team1: Team | null; team2: Team | null; winner: Team | null }

interface Props {
  matches: MatchWithTeams[]
  totalRounds: number
  courtOptions: string[]
  readOnly?: boolean
  highlightTeamIds?: string[]
  teamOptions?: TeamOption[]
  roundLabel?: (round: number, totalRounds: number) => string
}

type Line = { key: string; sx: number; sy: number; tx: number; ty: number; live: boolean }

export function BracketTree({ matches, totalRounds, courtOptions, readOnly, highlightTeamIds, teamOptions, roundLabel: roundLabelFn }: Props) {
  const matchesByRound = new Map<number, MatchWithTeams[]>()
  for (const m of matches) {
    const arr = matchesByRound.get(m.round) ?? []
    arr.push(m)
    matchesByRound.set(m.round, arr)
  }

  // A play-in round exists when the main first round (round 2) still contains
  // directly-seeded teams — i.e. some round-2 slot isn't fed by a round-1 match.
  // In a clean power-of-2 draw every round-2 slot is fed, so this stays false.
  const hasPlayIn = (matchesByRound.get(2) ?? []).some((m) => m.fromMatch1Pos == null || m.fromMatch2Pos == null)
  const labelFor = roundLabelFn ?? ((round: number, total: number) => roundLabel(round, total, hasPlayIn))

  // ---- Connector lines: measure each card and link it to its feeder matches. ----
  const containerRef = useRef<HTMLDivElement>(null)
  const cellRefs = useRef(new Map<number, HTMLElement>())
  const [lines, setLines] = useState<Line[]>([])
  const [size, setSize] = useState({ w: 0, h: 0 })

  const present = new Set(matches.map((m) => m.position))
  const liveByPos = new Map(matches.map((m) => [m.position, m.status === "COMPLETED" || m.status === "IN_PROGRESS"]))

  const setCell = useCallback(
    (pos: number) => (el: HTMLElement | null) => {
      if (el) cellRefs.current.set(pos, el)
      else cellRefs.current.delete(pos)
    },
    []
  )

  const measure = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const crect = container.getBoundingClientRect()
    const next: Line[] = []
    for (const m of matches) {
      const target = cellRefs.current.get(m.position)
      if (!target) continue
      const trect = target.getBoundingClientRect()
      for (const fromPos of [m.fromMatch1Pos, m.fromMatch2Pos]) {
        // Only connect feeders that live in this same tree (the DE losers
        // bracket pulls some feeders from the winners bracket — skip those).
        if (fromPos == null || !present.has(fromPos)) continue
        const source = cellRefs.current.get(fromPos)
        if (!source) continue
        const srect = source.getBoundingClientRect()
        next.push({
          key: `${fromPos}->${m.position}`,
          sx: srect.right - crect.left,
          sy: srect.top - crect.top + srect.height / 2,
          tx: trect.left - crect.left,
          ty: trect.top - crect.top + trect.height / 2,
          live: !!liveByPos.get(fromPos),
        })
      }
    }
    setLines(next)
    setSize({ w: container.scrollWidth, h: container.scrollHeight })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches])

  useLayoutEffect(() => {
    measure()
    const ro = new ResizeObserver(measure)
    if (containerRef.current) ro.observe(containerRef.current)
    window.addEventListener("resize", measure)
    return () => {
      ro.disconnect()
      window.removeEventListener("resize", measure)
    }
  }, [measure])

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
      <div ref={containerRef} className="relative flex min-w-max items-stretch gap-4 sm:gap-8">
        {size.w > 0 && (
          <svg
            className="pointer-events-none absolute left-0 top-0 z-0 overflow-visible"
            width={size.w}
            height={size.h}
            aria-hidden
          >
            {lines.map((l) => (
              <path
                key={l.key}
                d={`M ${l.sx} ${l.sy} C ${(l.sx + l.tx) / 2} ${l.sy}, ${(l.sx + l.tx) / 2} ${l.ty}, ${l.tx} ${l.ty}`}
                fill="none"
                strokeWidth={1.5}
                vectorEffect="non-scaling-stroke"
                style={{ stroke: l.live ? "hsl(var(--primary))" : "hsl(var(--border))", opacity: l.live ? 0.5 : 1 }}
              />
            ))}
          </svg>
        )}

        {Array.from({ length: totalRounds }, (_, i) => i + 1).map((round) => {
          const roundMatches = (matchesByRound.get(round) ?? []).sort((a, b) => a.position - b.position)
          return (
            <div key={round} className="relative z-10 flex w-52 shrink-0 flex-col sm:w-64">
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {labelFor(round, totalRounds)}
              </h4>
              <div
                className="flex flex-1 flex-col"
                style={{
                  justifyContent: round === 1 ? "flex-start" : "space-around",
                  gap: round === 1 ? "0.75rem" : `${Math.pow(2, round - 1) * 0.75}rem`,
                }}
              >
                {roundMatches.map((m) => (
                  <div key={m.id} ref={setCell(m.position)}>
                    {readOnly ? (
                      <MatchCard match={m} highlightTeamIds={highlightTeamIds} />
                    ) : (
                      <EditableMatchCard
                        match={m}
                        courtOptions={courtOptions}
                        highlightTeamIds={highlightTeamIds}
                        teamOptions={teamOptions}
                        totalRounds={totalRounds}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function roundLabel(round: number, totalRounds: number, hasPlayIn = false): string {
  if (hasPlayIn && round === 1) return "Play-In"
  const fromEnd = totalRounds - round
  if (fromEnd === 0) return "Final"
  if (fromEnd === 1) return "Semifinal"
  if (fromEnd === 2) return "Quarterfinal"
  // Round-of-N label for earlier rounds (accounts for the extra play-in round).
  const teamsThisRound = Math.pow(2, fromEnd + 1)
  if (hasPlayIn) return `Round of ${teamsThisRound}`
  return `Round ${round}`
}
