import { SignIn } from "@clerk/nextjs"
import Link from "next/link"
import { Logo } from "@/components/shared/Logo"

export default function SignInPage() {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[400px] bg-[radial-gradient(60%_50%_at_50%_0%,hsl(var(--primary)/0.15),transparent)]"
      />
      <header className="container flex h-14 items-center">
        <Link href="/">
          <Logo size={26} />
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <SignIn />
      </main>
    </div>
  )
}
