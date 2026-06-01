import type { Metadata, Viewport } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"
import { Providers } from "@/providers"

export const metadata: Metadata = {
  title: { default: "Dink Tracker", template: "%s | Dink Tracker" },
  description: "Real-time pickleball tournament management",
  applicationName: "Dink Tracker",
  appleWebApp: { capable: true, title: "Dink Tracker", statusBarStyle: "black-translucent" },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0c1118" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

// The app is fully auth-gated and DB-backed, so nothing is meaningfully static.
// Forcing dynamic rendering also stops `next build` from statically prerendering
// the Clerk-wrapped /_not-found page, which throws "Missing publishableKey" when
// the key isn't inlined at build time.
export const dynamic = "force-dynamic"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
