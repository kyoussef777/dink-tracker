# /live-feature — Implement a Real-Time Pusher Feature

Guides implementation of any real-time feature in dink-tracker using Pusher Channels. Use when a feature requires live updates across multiple clients (e.g., score updates, match status changes, bracket advancement).

## Pusher Setup (one-time)

### Environment Variables (`.env.local`)
```env
NEXT_PUBLIC_PUSHER_KEY=your_key
NEXT_PUBLIC_PUSHER_CLUSTER=us2
PUSHER_APP_ID=your_app_id
PUSHER_SECRET=your_secret
```

### Server Client (`lib/pusher.ts`)
```ts
import Pusher from "pusher"

export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
})
```

### Browser Client (`lib/pusher-client.ts`)
```ts
import PusherJs from "pusher-js"

export const pusherClient = new PusherJs(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
})
```

## Channel + Event Naming Convention

| What changed | Channel | Event |
|---|---|---|
| Match score | `tournament-{tournamentId}` | `match-updated` |
| Bracket advanced | `tournament-{tournamentId}` | `bracket-advanced` |
| Match status | `bracket-{bracketId}` | `match-status-changed` |
| Tournament status | `tournament-{tournamentId}` | `tournament-status-changed` |

Use **public channels** (no `private-` prefix) for tournament views. Private channels require a Pusher auth endpoint — add only if you need per-user access control.

## API Route Pattern (trigger after mutation)

```ts
// app/api/matches/[id]/route.ts
import { pusherServer } from "@/lib/pusher"

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json()
  const validated = MatchUpdateSchema.parse(body)

  const match = await db.match.update({
    where: { id: params.id },
    data: { score1: validated.score1, score2: validated.score2, status: validated.status },
    include: { bracket: { select: { tournamentId: true } } },
  })

  // Trigger AFTER successful DB write
  await pusherServer.trigger(
    `tournament-${match.bracket.tournamentId}`,
    "match-updated",
    { matchId: match.id, bracketId: match.bracketId, score1: match.score1, score2: match.score2 }
  )

  return Response.json({ data: match })
}
```

## Client Hook (`hooks/useLive.ts`)

```ts
"use client"
import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { pusherClient } from "@/lib/pusher-client"

export function useLive(tournamentId: string) {
  const qc = useQueryClient()

  useEffect(() => {
    const channel = pusherClient.subscribe(`tournament-${tournamentId}`)

    channel.bind("match-updated", (data: { bracketId: string }) => {
      qc.invalidateQueries({ queryKey: ["bracket", data.bracketId] })
      qc.invalidateQueries({ queryKey: ["tournament", tournamentId] })
    })

    channel.bind("bracket-advanced", (data: { bracketId: string }) => {
      qc.invalidateQueries({ queryKey: ["bracket", data.bracketId] })
    })

    return () => {
      channel.unbind_all()
      pusherClient.unsubscribe(`tournament-${tournamentId}`)
    }
  }, [tournamentId, qc])
}
```

## Live Indicator Component

```tsx
// components/shared/LiveIndicator.tsx
"use client"
import { useEffect, useState } from "react"
import { pusherClient } from "@/lib/pusher-client"
import { cn } from "@/lib/utils"

export function LiveIndicator({ tournamentId }: { tournamentId: string }) {
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    pusherClient.connection.bind("connected", () => setConnected(true))
    pusherClient.connection.bind("disconnected", () => setConnected(false))
    return () => pusherClient.connection.unbind_all()
  }, [])

  return (
    <span className="flex items-center gap-1.5 text-xs font-medium">
      <span className={cn("h-2 w-2 rounded-full", connected ? "bg-green-500 animate-pulse" : "bg-muted")} />
      {connected ? "Live" : "Connecting..."}
    </span>
  )
}
```

## Where to Place `useLive`

Add to the **tournament detail page layout** so it covers all child routes (brackets, matches):

```tsx
// app/(dashboard)/tournaments/[id]/layout.tsx
"use client"
export default function TournamentLayout({ children, params }) {
  useLive(params.id)   // one subscription covers all children
  return <>{children}</>
}
```

## Testing Pusher

In Vitest, mock Pusher:
```ts
vi.mock("@/lib/pusher", () => ({
  pusherServer: { trigger: vi.fn().mockResolvedValue(undefined) },
}))
```
Verify `pusherServer.trigger` was called with the correct channel and event after a score update.

## Arguments

$ARGUMENTS
