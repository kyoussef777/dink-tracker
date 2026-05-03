# Implementing Drag-and-Drop & Sortable Interfaces

Implements drag-and-drop and sortable interfaces with React/TypeScript using dnd-kit. Use for bracket seeding, team reordering, court assignment drag-and-drop, and any other direct-manipulation UI in this app.

## In This Project, Drag-and-Drop Is Used For

- **Bracket seeding** — reorder teams before a bracket generates (`.claude/commands/` → BracketSeedEditor)
- **Court assignment** — drag a match card onto a court slot
- **Tournament bracket builder** — drag teams into custom bracket positions
- **Score board reorder** — drag columns/rows in standings tables

## Library

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

## Step 1 — Choose Pattern

| Need | Pattern |
|---|---|
| Reorder a single list (team seeds) | SortableList |
| Move cards between columns (match courts) | Kanban / multi-container |
| 2D grid drag (bracket builder) | Grid |
| File upload | Dropzone (use `react-dropzone` instead) |

## Step 2 — Sortable List Pattern

```tsx
// components/bracket/SeedEditor.tsx
"use client"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"

interface SortableTeamProps { id: string; name: string; seed: number }

function SortableTeam({ id, name, seed }: SortableTeamProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-card p-3 select-none",
        isDragging && "opacity-50 shadow-lg ring-2 ring-primary"
      )}
      {...attributes}
    >
      <button
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        aria-label={`Drag to reorder ${name}`}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="text-sm font-medium text-muted-foreground w-6">{seed}</span>
      <span className="flex-1 font-medium">{name}</span>
    </div>
  )
}

export function SeedEditor({ teams, onReorder }: {
  teams: { id: string; name: string }[]
  onReorder: (newOrder: string[]) => void
}) {
  const [items, setItems] = useState(teams)
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    setItems((prev) => {
      const oldIdx = prev.findIndex((t) => t.id === active.id)
      const newIdx = prev.findIndex((t) => t.id === over.id)
      const next = arrayMove(prev, oldIdx, newIdx)
      onReorder(next.map((t) => t.id))
      return next
    })
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2" role="list" aria-label="Drag to reorder teams by seed">
          {items.map((team, idx) => (
            <SortableTeam key={team.id} id={team.id} name={team.name} seed={idx + 1} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
```

## Step 3 — Multi-Container (Court Assignment)

```tsx
// components/match/CourtAssigner.tsx — drag MatchCard onto CourtSlot
import { DndContext, DragOverlay, useDroppable, useDraggable } from "@dnd-kit/core"

function CourtSlot({ courtId, children }: { courtId: string; children?: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({ id: courtId })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-24 rounded-xl border-2 border-dashed p-3 transition-colors",
        isOver ? "border-primary bg-primary/10" : "border-muted"
      )}
      aria-label={`Court ${courtId}`}
      aria-dropeffect="move"
    >
      {children ?? <p className="text-sm text-muted-foreground text-center mt-4">Drop match here</p>}
    </div>
  )
}

function DraggableMatch({ match }: { match: Match }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: match.id })
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn("cursor-grab active:cursor-grabbing", isDragging && "opacity-0")}
    >
      <MatchCard match={match} />
    </div>
  )
}
```

## Step 4 — Persist Order (Optimistic Update)

```ts
// hooks/useBracketSeed.ts
export function useBracketSeed(bracketId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (orderedTeamIds: string[]) =>
      fetch(`/api/brackets/${bracketId}/seed`, {
        method: "PATCH",
        body: JSON.stringify({ orderedTeamIds }),
      }),
    onMutate: async (orderedTeamIds) => {
      await qc.cancelQueries({ queryKey: ["bracket", bracketId] })
      const prev = qc.getQueryData(["bracket", bracketId])
      qc.setQueryData(["bracket", bracketId], (old: any) => ({
        ...old,
        teams: orderedTeamIds.map((id, idx) => ({
          ...old.teams.find((t: any) => t.id === id),
          seed: idx + 1,
        })),
      }))
      return { prev }
    },
    onError: (_, __, ctx) => qc.setQueryData(["bracket", bracketId], ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ["bracket", bracketId] }),
  })
}
```

## Accessibility Checklist

- `aria-label` on drag handle buttons ("Drag to reorder {name}")
- `role="list"` on the container, `role="listitem"` if not using semantic HTML
- `KeyboardSensor` always included alongside `PointerSensor`
- Keyboard: Space/Enter to grab, arrow keys to move, Space/Enter/Escape to drop/cancel
- Announce changes with `aria-live="polite"` region: "Team moved to position 3"
- Never use `onClick` for the drag handle — it blocks the drag gesture on touch

## Touch Support

```tsx
import { TouchSensor } from "@dnd-kit/core"
// Replace PointerSensor with both for better touch behavior:
useSensor(MouseSensor),
useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
```

The `delay: 200` prevents accidental drags during scroll on mobile.

## Drag Overlay (Custom Preview)

Always implement `DragOverlay` to avoid the browser's ghost image:
```tsx
const [activeId, setActiveId] = useState<string | null>(null)

<DndContext onDragStart={({ active }) => setActiveId(active.id as string)} ...>
  {/* list */}
  <DragOverlay>
    {activeId ? <TeamRow id={activeId} className="rotate-1 shadow-xl" /> : null}
  </DragOverlay>
</DndContext>
```

## Performance Notes

- For brackets with >100 teams, wrap in `React.memo` and use `useMemo` for the items array
- Use `CSS.Transform.toString(transform)` — never `left`/`top` positioning
- Add `will-change: transform` via Tailwind `will-change-transform` only on the dragged element

## Arguments

$ARGUMENTS
