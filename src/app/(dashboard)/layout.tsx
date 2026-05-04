import { UserButton } from "@clerk/nextjs"
import Link from "next/link"
import { getCurrentRole } from "@/lib/auth"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const current = await getCurrentRole()
  const isAdmin = current?.role === "ADMIN"

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <Link
            href={isAdmin ? "/tournaments" : "/my"}
            className="flex items-center gap-2 font-bold text-lg tracking-tight"
          >
            <span className="inline-block h-6 w-6 rounded-md bg-primary" aria-hidden="true" />
            <span>Dink Tracker</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              href="/my"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              My matches
            </Link>
            {isAdmin && (
              <>
                <Link
                  href="/tournaments"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Tournaments
                </Link>
                <Link
                  href="/admin/users"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Users
                </Link>
              </>
            )}
            <UserButton afterSignOutUrl="/" />
          </nav>
        </div>
      </header>
      <main className="container py-8">{children}</main>
    </div>
  )
}
