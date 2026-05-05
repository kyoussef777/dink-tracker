"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2 } from "lucide-react"
import { useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Card, CardContent } from "@/components/ui/card"
import { TeamsCsvImport, type ImportedTeam } from "./TeamsCsvImport"

const emailField = z.string().email("Invalid email").optional().or(z.literal(""))

const TeamSchema = z.object({
  name: z.string().min(1, "Team name required").max(100),
  player1: z.string().min(1, "Player name required").max(100),
  player1Email: emailField,
  player2: z.string().max(100).optional(),
  player2Email: emailField,
})

const FormSchema = z.object({
  teams: z.array(TeamSchema).min(2, "At least 2 teams required"),
})

type FormValues = z.infer<typeof FormSchema>

const emptyTeam = { name: "", player1: "", player1Email: "", player2: "", player2Email: "" }

export function AddTeamsForm({ bracketId }: { bracketId: string }) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: { teams: [{ ...emptyTeam }, { ...emptyTeam }, { ...emptyTeam }, { ...emptyTeam }] },
  })

  const { fields, append, remove, replace } = useFieldArray({ control: form.control, name: "teams" })

  function handleImport(teams: ImportedTeam[]) {
    replace(
      teams.map((t) => ({
        name: t.name,
        player1: t.player1,
        player1Email: t.player1Email ?? "",
        player2: t.player2 ?? "",
        player2Email: t.player2Email ?? "",
      }))
    )
  }

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    try {
      const payload = {
        teams: values.teams.map((t) => ({
          name: t.name,
          players: [
            { name: t.player1, ...(t.player1Email ? { email: t.player1Email } : {}) },
            ...(t.player2
              ? [{ name: t.player2, ...(t.player2Email ? { email: t.player2Email } : {}) }]
              : []),
          ],
        })),
      }

      const res = await fetch(`/api/brackets/${bracketId}/teams`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed")

      toast.success(`Bracket generated with ${json.data.matchCount} matches`)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Add emails so players can sign in and follow their bracket.
          </p>
          <TeamsCsvImport onImport={handleImport} />
        </div>
        <div className="space-y-3">
          {fields.map((field, index) => (
            <Card key={field.id} className="border-muted">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-muted text-sm font-semibold text-muted-foreground">
                    {index + 1}
                  </div>
                  <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    <FormField
                      control={form.control}
                      name={`teams.${index}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">Team name</FormLabel>
                          <FormControl>
                            <Input placeholder="The Dinkers" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`teams.${index}.player1`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">Player 1</FormLabel>
                          <FormControl>
                            <Input placeholder="Alex Kim" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`teams.${index}.player1Email`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                            Player 1 email <span className="lowercase italic">(optional)</span>
                          </FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="alex@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`teams.${index}.player2`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                            Player 2 <span className="lowercase italic">(optional)</span>
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="Jamie Lee" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`teams.${index}.player2Email`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                            Player 2 email <span className="lowercase italic">(optional)</span>
                          </FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="jamie@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  {fields.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => remove(index)}
                      aria-label={`Remove team ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <Button type="button" variant="outline" onClick={() => append({ ...emptyTeam })}>
            <Plus className="h-4 w-4" />
            Add team
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Generating..." : `Generate bracket (${fields.length} teams)`}
          </Button>
        </div>
      </form>
    </Form>
  )
}
