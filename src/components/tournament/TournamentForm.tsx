"use client"
import { useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import type { Tournament } from "@prisma/client"

// Form-side schema uses date-only strings (HTML date input). Converted to ISO before submit.
const FormSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(100),
    venue: z.string().max(200).optional(),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().optional(),
    description: z.string().max(1000).optional(),
    courts: z
      .array(z.object({ name: z.string().min(1, "Required").max(50) }))
      .max(64),
  })
  .refine((d) => !d.endDate || new Date(d.endDate) >= new Date(d.startDate), {
    message: "End date must be on or after start date",
    path: ["endDate"],
  })

type FormValues = z.infer<typeof FormSchema>

interface Props {
  tournament?: Tournament
  onSuccess?: () => void
}

export function TournamentForm({ tournament, onSuccess }: Props) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: tournament?.name ?? "",
      venue: tournament?.venue ?? "",
      startDate: tournament ? new Date(tournament.startDate).toISOString().slice(0, 10) : "",
      endDate: tournament?.endDate ? new Date(tournament.endDate).toISOString().slice(0, 10) : "",
      description: tournament?.description ?? "",
      courts: (tournament?.courtNames ?? []).map((name) => ({ name })),
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "courts",
  })

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    try {
      const payload = {
        name: values.name,
        startDate: new Date(values.startDate).toISOString(),
        endDate: values.endDate ? new Date(values.endDate).toISOString() : undefined,
        venue: values.venue || undefined,
        description: values.description || undefined,
        courtNames: values.courts.map((c) => c.name.trim()).filter(Boolean),
      }

      const res = await fetch(
        tournament ? `/api/tournaments/${tournament.id}` : "/api/tournaments",
        {
          method: tournament ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        }
      )

      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Request failed")

      toast.success(tournament ? "Tournament updated" : "Tournament created")
      router.refresh()
      onSuccess?.()
      if (!tournament) router.push(`/tournaments/${json.data.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  function addCourt() {
    append({ name: `Court ${fields.length + 1}` })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Spring Open 2026" autoFocus {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="venue"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Venue <span className="text-muted-foreground">(optional)</span>
              </FormLabel>
              <FormControl>
                <Input placeholder="Dink City Recreation Center" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  End date <span className="text-muted-foreground">(optional)</span>
                </FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Courts</Label>
            <span className="text-xs text-muted-foreground">{fields.length} configured</span>
          </div>
          <div className="space-y-2">
            {fields.map((f, i) => (
              <div key={f.id} className="flex items-center gap-2">
                <FormField
                  control={form.control}
                  name={`courts.${i}.name` as const}
                  render={({ field }) => (
                    <FormItem className="flex-1 space-y-0">
                      <FormControl>
                        <Input placeholder={`Court ${i + 1}`} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(i)}
                  aria-label={`Remove court ${i + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addCourt}
            disabled={fields.length >= 64}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Add court
          </Button>
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Description <span className="text-muted-foreground">(optional)</span>
              </FormLabel>
              <FormControl>
                <Textarea rows={3} placeholder="Tell players what to expect" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : tournament ? "Save changes" : "Create tournament"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
