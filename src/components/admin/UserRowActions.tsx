"use client"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { MoreHorizontal, Ban, CircleCheck, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TypeToConfirmDialog } from "@/components/shared/TypeToConfirmDialog"

interface Props {
  userId: string
  name: string
  banned: boolean
  isSelf: boolean
}

export function UserRowActions({ userId, name, banned, isSelf }: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function toggleBan() {
    start(async () => {
      const res = await fetch(`/api/admin/users/${userId}/ban`, { method: banned ? "DELETE" : "POST" })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(json.error ?? "Failed to update user")
        return
      }
      toast.success(banned ? `${name} unbanned` : `${name} banned`)
      router.refresh()
    })
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? "Failed to delete user")
      toast.success(`${name} deleted`)
      setDeleteOpen(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete user")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${name}`} disabled={isSelf}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onSelect={toggleBan} disabled={pending}>
            {banned ? (
              <>
                <CircleCheck className="h-4 w-4" />
                Unban
              </>
            ) : (
              <>
                <Ban className="h-4 w-4" />
                Ban
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <TypeToConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        word="delete"
        title={`Delete ${name}?`}
        description="Permanently deletes this user's account. Any player records linked to them are unlinked, not deleted. This cannot be undone."
        confirmLabel="Delete user"
        pendingLabel="Deleting..."
        busy={deleting}
        onConfirm={handleDelete}
      />
    </>
  )
}
