"use client"
import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Download, FileUp, Users } from "lucide-react"
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
import { parseRegistrationsCsv, groupBySkillLevel, type RegistrationRow } from "@/lib/registration-csv"

interface Props {
  tournamentId: string
}

export function RegistrationsCsvImport({ tournamentId }: Props) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<{ rows: RegistrationRow[]; groups: Map<string, RegistrationRow[]> } | null>(null)

  function pickFile() {
    inputRef.current?.click()
  }

  function reset() {
    setPreview(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  async function handleFile(file: File) {
    try {
      const text = await file.text()
      const { rows, errors } = parseRegistrationsCsv(text)
      if (errors.length > 0) {
        const msg = errors.slice(0, 3).join(" • ") + (errors.length > 3 ? ` • +${errors.length - 3} more` : "")
        throw new Error(msg)
      }
      if (rows.length < 2) throw new Error("Need at least 2 rows")
      const groups = groupBySkillLevel(rows)
      for (const [skill, list] of groups) {
        if (list.length < 2) {
          throw new Error(`Skill level "${skill}" only has ${list.length} row — need at least 2.`)
        }
      }
      setPreview({ rows, groups })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not parse CSV")
      reset()
    }
  }

  async function submit() {
    if (!preview) return
    setBusy(true)
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/import-registrations`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rows: preview.rows }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Import failed")
      const { brackets, totalTeams } = json.data as {
        brackets: { skillLevel: string; teamCount: number }[]
        totalTeams: number
      }
      const bracketSummary = brackets.map((b) => `${b.skillLevel} (${b.teamCount})`).join(", ")
      toast.success(`Imported ${totalTeams} teams across: ${bracketSummary}`)
      setOpen(false)
      reset()
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Users className="h-4 w-4" />
          Import registrations
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import registrations from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV of registered teams. We&apos;ll auto-create a bracket for each skill level and seed the matches.
          </DialogDescription>
        </DialogHeader>

        {!preview ? (
          <div className="space-y-4 text-sm">
            <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
              <p className="font-medium">Required columns</p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>
                  <code className="rounded bg-background px-1.5 py-0.5 font-mono">player1_name</code> — registrant&apos;s full name
                </li>
                <li>
                  <code className="rounded bg-background px-1.5 py-0.5 font-mono">player2_name</code> — partner&apos;s full name
                </li>
                <li>
                  <code className="rounded bg-background px-1.5 py-0.5 font-mono">skill_level</code> — e.g. Beginner-Intermediate, Intermediate-Advanced, 4.0, 4.5
                </li>
              </ul>
              <p className="pt-2 font-medium">Optional columns</p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>
                  <code className="rounded bg-background px-1.5 py-0.5 font-mono">phone</code> — registrant&apos;s phone
                </li>
                <li>
                  <code className="rounded bg-background px-1.5 py-0.5 font-mono">email</code> /{" "}
                  <code className="rounded bg-background px-1.5 py-0.5 font-mono">partner_email</code> — auto-link player accounts
                </li>
                <li>
                  <code className="rounded bg-background px-1.5 py-0.5 font-mono">team_name</code> — overrides default &ldquo;First &amp; First&rdquo;
                </li>
              </ul>
              <p className="pt-2 text-xs text-muted-foreground">
                Each row = one team (a player + their partner). Rows are grouped by skill level into separate brackets.
              </p>
            </div>

            <a
              href="/registrations-template.csv"
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
        ) : (
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              {preview.rows.length} teams ready to import across {preview.groups.size}{" "}
              {preview.groups.size === 1 ? "bracket" : "brackets"}:
            </p>
            <ul className="space-y-1.5">
              {Array.from(preview.groups).map(([skill, list]) => (
                <li
                  key={skill}
                  className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2"
                >
                  <span className="font-medium">{skill}</span>
                  <span className="text-xs text-muted-foreground">
                    {list.length} {list.length === 1 ? "team" : "teams"}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              An empty bracket will be auto-created for each skill level. If a bracket already has teams, the import is rejected.
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {preview ? (
            <>
              <Button type="button" variant="outline" onClick={reset} disabled={busy}>
                Choose another file
              </Button>
              <Button type="button" onClick={submit} disabled={busy}>
                {busy ? "Importing..." : `Import ${preview.rows.length} teams`}
              </Button>
            </>
          ) : (
            <Button type="button" onClick={pickFile} className="gap-1.5">
              <FileUp className="h-4 w-4" />
              Choose CSV file
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
