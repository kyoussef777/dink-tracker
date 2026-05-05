"use client"
import { ClerkProvider } from "@clerk/nextjs"
import { dark } from "@clerk/themes"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { ThemeProvider, useTheme } from "next-themes"
import { useState } from "react"
import { Toaster } from "@/components/ui/sonner"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <InnerProviders>{children}</InnerProviders>
    </ThemeProvider>
  )
}

function InnerProviders({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme()
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30 * 1000, retry: 1 },
        },
      })
  )

  return (
    <ClerkProvider appearance={{ baseTheme: resolvedTheme === "dark" ? dark : undefined }}>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster richColors position="top-right" />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ClerkProvider>
  )
}
