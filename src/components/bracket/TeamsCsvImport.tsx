"use client"
import { useRef, useState } from "react"
import { Download, FileUp } from "lucide-react"
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
import { parseCsv } from "@/lib/csv"

export type ImportedTeam = {
  name: string
  player1: string
  player1Email?: string
  player2?: string
  player2Email?: string
}

const REQUIRED_HEADERS = ["team_name", "player1_name"] as const

interface Props {
  onImport: (teams: ImportedTeam[]) => void
}

export function TeamsCsvImport({ onImport }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  function pickFile() {
    inputRef.current?.click()
  }

  async function handleFile(file: File) {
    setBusy(true)
    try {
      const text = await file.text()
      const rows = parseCsv(text)
      if (rows.length === 0) throw new Error("CSV is empty")

      const headers = Object.keys(rows[0])
      const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h))
      if (missing.length > 0) {
        throw new Error(`Missing required column${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}`)
      }

      const teams: ImportedTeam[] = []
      const errors: string[] = []
      rows.forEach((r, i) => {
        const teamName = r.team_name?.trim()
        const p1 = r.player1_name?.trim()
        if (!teamName) {
          errors.push(`Row ${i + 2}: missing team_name`)
          return
        }
        if (!p1) {
          errors.push(`Row ${i + 2}: missing player1_name`)
          return
        }
        teams.push({
          name: teamName,
          player1: p1,
          player1Email: r.player1_email?.trim() || undefined,
          player2: r.player2_name?.trim() || undefined,
          player2Email: r.player2_email?.trim() || undefined,
        })
      })

      if (errors.length > 0) {
        throw new Error(errors.slice(0, 3).join(" • ") + (errors.length > 3 ? ` • +${errors.length - 3} more` : ""))
      }
      if (teams.length < 2) throw new Error("Need at least 2 teams")

      onImport(teams)
      toast.success(`Loaded ${teams.length} teams from CSV`)
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not parse CSV")
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1.5">
          <FileUp className="h-4 w-4" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import teams from CSV</DialogTitle>
          <DialogDescription>
            Bulk-load teams instead of typing them in. Existing rows in the form will be replaced.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
            <p className="font-medium">Required columns</p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>
                <code className="rounded bg-background px-1.5 py-0.5 font-mono">team_name</code> — display name for the team
              </li>
              <li>
                <code className="rounded bg-background px-1.5 py-0.5 font-mono">player1_name</code> — first player&apos;s full name
              </li>
            </ul>
            <p className="pt-2 font-medium">Optional columns</p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>
                <code className="rounded bg-background px-1.5 py-0.5 font-mono">player1_email</code> — used to auto-link player accounts
              </li>
              <li>
                <code className="rounded bg-background px-1.5 py-0.5 font-mono">player2_name</code>,{" "}
                <code className="rounded bg-background px-1.5 py-0.5 font-mono">player2_email</code> — second player (doubles)
              </li>
            </ul>
            <p className="pt-2 text-xs text-muted-foreground">
              Headers are case-insensitive. First row must be the header row. Minimum 2 teams.
            </p>
          </div>

          <a
            href="/teams-template.csv"
            download
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <Download className="h-3.5 w-3.5" />
            Download template
          </a>

          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
            }}
          />
        </div>

        <DialogFooter>
          <Button type="button" onClick={pickFile} disabled={busy}>
            {busy ? "Reading..." : "Choose CSV file"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

