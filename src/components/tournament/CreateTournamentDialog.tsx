"use client"
import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { TournamentForm } from "./TournamentForm"

export function CreateTournamentDialog() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          New tournament
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create tournament</DialogTitle>
          <DialogDescription>Set up a new tournament. You can add brackets and players next.</DialogDescription>
        </DialogHeader>
        <TournamentForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
