import Link from "next/link"
import { Button } from "@/components/ui/button"

// Rendered at request time so `next build` doesn't statically prerender this
// page inside <ClerkProvider> (which needs the publishable key at build time).
export const dynamic = "force-dynamic"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">404</p>
        <h1 className="text-3xl font-bold tracking-tight">Page not found</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or may have been moved.
        </p>
      </div>
      <Button asChild>
        <Link href="/">Back to home</Link>
      </Button>
    </div>
  )
}
