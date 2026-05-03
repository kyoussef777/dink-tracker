import { UserButton } from "@clerk/nextjs"
import Link from "next/link"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/tournaments" className="flex items-center gap-2 font-bold text-lg tracking-tight">
            <span className="inline-block h-6 w-6 rounded-md bg-primary" aria-hidden="true" />
            <span>Dink Tracker</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/tournaments" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Tournaments
            </Link>
            <UserButton afterSignOutUrl="/" />
          </nav>
        </div>
      </header>
      <main className="container py-8">{children}</main>
    </div>
  )
}
