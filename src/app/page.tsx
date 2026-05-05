import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@clerk/nextjs/server"
import { ArrowRight, Trophy, Users, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/shared/Logo"
import { ThemeToggle } from "@/components/shared/ThemeToggle"
import { getCurrentRole } from "@/lib/auth"

export default async function Home() {
  const { userId } = await auth()
  if (userId) {
    const current = await getCurrentRole()
    redirect(current?.role === "ADMIN" ? "/tournaments" : "/my")
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[480px] bg-[radial-gradient(60%_50%_at_50%_0%,hsl(var(--primary)/0.18),transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-[-120px] top-[120px] -z-10 h-72 w-72 rounded-full bg-accent/20 blur-3xl"
      />
      <header className="sticky top-0 z-50 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between gap-3">
          <Link href="/">
            <Logo size={26} />
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/sign-up">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="container py-16 sm:py-24">
        <section className="mx-auto max-w-2xl space-y-6 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Run pickleball tournaments without the spreadsheet
          </h1>
          <p className="text-lg text-muted-foreground">
            Live brackets, court assignment, real-time score updates, and a player view that just works on a phone.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/sign-up" className="gap-1.5">
                Get started
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/sign-in">I already have an account</Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto mt-20 grid max-w-4xl gap-6 sm:grid-cols-3">
          <Feature
            icon={<Trophy className="h-5 w-5" />}
            title="Multiple skill brackets"
            body="Run 3.0, 4.0, 5.0, and Open in parallel. Each bracket has its own teams and format."
          />
          <Feature
            icon={<Zap className="h-5 w-5" />}
            title="Live scoring"
            body="Scores update everywhere instantly. Players follow along on their phones, no refresh."
          />
          <Feature
            icon={<Users className="h-5 w-5" />}
            title="Player view"
            body="Players sign in to see exactly when and where they play next — no shouting from the desk."
          />
        </section>
      </main>
    </div>
  )
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="space-y-2 rounded-xl border bg-card/80 p-5 shadow-sm transition-colors hover:border-primary/40">
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  )
}
