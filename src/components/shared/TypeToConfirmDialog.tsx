"use client"
import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  /** The word the user must type to enable the confirm button. Defaults to "reset". */
  word?: string
  confirmLabel: string
  pendingLabel?: string
  busy?: boolean
  onConfirm: () => void
}

/**
 * A guarded confirmation dialog for high-stakes, irreversible actions: the
 * confirm button stays disabled until the user types a required word (e.g.
 * "reset"). Clears its input whenever it closes.
 */
export function TypeToConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  word = "reset",
  confirmLabel,
  pendingLabel,
  busy,
  onConfirm,
}: Props) {
  const [value, setValue] = useState("")
  const matches = value.trim().toLowerCase() === word.toLowerCase()

  useEffect(() => {
    if (!open) setValue("")
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="type-to-confirm">
            Type <span className="font-semibold text-foreground">{word}</span> to confirm
          </Label>
          <Input
            id="type-to-confirm"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoComplete="off"
            autoFocus
            placeholder={word}
            onKeyDown={(e) => {
              if (e.key === "Enter" && matches && !busy) onConfirm()
            }}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={!matches || busy}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {busy ? (pendingLabel ?? "Working...") : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
