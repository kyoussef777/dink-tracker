"use client"
import { useState } from "react"
import { MessageSquare, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

const MAX = 1000

export function NotifyPlayersDialog({ tournamentId }: { tournamentId: string }) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)

  async function handleSend() {
    const trimmed = message.trim()
    if (!trimmed) {
      toast.error("Enter a message first")
      return
    }
    setSending(true)
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/notify`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? "Failed to send")

      const { sent, failed, skipped } = json.data as {
        sent: number
        failed: number
        skipped: number
      }
      const parts = [`${sent} sent`]
      if (failed > 0) parts.push(`${failed} failed`)
      if (skipped > 0) parts.push(`${skipped} skipped`)
      toast.success(`Texts: ${parts.join(" · ")}`)
      setMessage("")
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <MessageSquare className="h-4 w-4" />
          Text players
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Text players</DialogTitle>
          <DialogDescription>
            Sends an SMS to every player in this tournament who has a phone number on file.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="notify-message">Message</Label>
          <Textarea
            id="notify-message"
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MAX))}
            placeholder="Courts open at 9am sharp. Check in at the front desk."
            rows={4}
            autoFocus
          />
          <p className="text-right text-xs text-muted-foreground tabular-nums">
            {message.length}/{MAX}
          </p>
        </div>
        <DialogFooter>
          <Button onClick={handleSend} disabled={sending || message.trim().length === 0}>
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : (
              "Send"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
