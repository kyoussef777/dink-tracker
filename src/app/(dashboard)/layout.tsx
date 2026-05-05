import { UserButton } from "@clerk/nextjs"
import Link from "next/link"
import { Trophy, User as UserIcon, Users } from "lucide-react"
import { getCurrentRole } from "@/lib/auth"
import { Logo } from "@/components/shared/Logo"
import { ThemeToggle } from "@/components/shared/ThemeToggle"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const current = await getCurrentRole()
  const isAdmin = current?.role === "ADMIN"

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between gap-3">
          <Link href={isAdmin ? "/tournaments" : "/my"} className="flex items-center gap-2">
            <Logo size={26} />
          </Link>
          <nav className="flex items-center gap-1 sm:gap-4">
            <NavLink href="/my" icon={<UserIcon className="h-4 w-4" />} label="My matches" />
            {isAdmin && (
              <>
                <NavLink href="/tournaments" icon={<Trophy className="h-4 w-4" />} label="Tournaments" />
                <NavLink href="/admin/users" icon={<Users className="h-4 w-4" />} label="Users" />
              </>
            )}
            <ThemeToggle className="ml-1" />
            <UserButton afterSignOutUrl="/" />
          </nav>
        </div>
      </header>
      <main className="container py-6 sm:py-8">{children}</main>
    </div>
  )
}

function NavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:py-1.5"
      aria-label={label}
    >
      <span className="sm:hidden">{icon}</span>
      <span className="hidden sm:inline">{label}</span>
    </Link>
  )
}
