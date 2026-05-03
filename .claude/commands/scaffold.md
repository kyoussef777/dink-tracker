# /scaffold — Bootstrap Phase 1 (Run Once)

Sets up the full Next.js application from scratch. Only run this once on a fresh repo. After completion, commit and proceed to `/new-feature tournament-crud`.

## Prerequisites

- Node.js 20+ installed
- Vercel CLI installed (`npm i -g vercel`)
- Neon DB provisioned via Vercel Marketplace (`vercel integration add neon`)
- Clerk account + app created (get keys from dashboard.clerk.com)
- Pusher app created (get keys from pusher.com)

## Step 1 — Create Next.js App

```bash
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-git
```

## Step 2 — Install Dependencies

```bash
npm install prisma @prisma/client
npm install zustand @tanstack/react-query @tanstack/react-query-devtools
npm install pusher pusher-js
npm install zod react-hook-form @hookform/resolvers
npm install @clerk/nextjs
npm install lucide-react clsx tailwind-merge class-variance-authority
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/user-event jsdom
npm install -D @playwright/test tsx
```

## Step 3 — Initialize shadcn

```bash
npx shadcn@latest init
```
Choose: Default style, Zinc base color, CSS variables yes.

Then install base components:
```bash
npx shadcn@latest add button input label textarea select dialog sheet badge card separator avatar skeleton tabs command popover
```

## Step 4 — Prisma Schema

Create `prisma/schema.prisma` using the exact schema from CLAUDE.md. Then:
```bash
npx prisma generate
```

## Step 5 — Environment Variables

Create `.env.local`:
```env
DATABASE_URL=
DIRECT_URL=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_PUSHER_KEY=
NEXT_PUBLIC_PUSHER_CLUSTER=us2
PUSHER_APP_ID=
PUSHER_SECRET=
```

Pull from Vercel after linking: `vercel env pull .env.local`

## Step 6 — Config Files

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import { resolve } from "path"

export default defineConfig({
  plugins: [react()],
  test: { environment: "jsdom", globals: true, setupFiles: ["./src/test/setup.ts"] },
  resolve: { alias: { "@": resolve(__dirname, "./src") } },
})
```

Create `src/test/setup.ts`:
```ts
import "@testing-library/jest-dom"
```

Create `playwright.config.ts`:
```ts
import { defineConfig } from "@playwright/test"
export default defineConfig({
  testDir: "./tests/e2e",
  webServer: { command: "npm run dev", url: "http://localhost:3000", reuseExistingServer: true },
  use: { baseURL: "http://localhost:3000" },
})
```

Add scripts to `package.json`:
```json
{
  "db:push": "prisma db push",
  "db:migrate": "prisma migrate dev",
  "db:studio": "prisma studio",
  "db:seed": "tsx prisma/seed.ts",
  "test": "vitest",
  "test:run": "vitest run",
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui",
  "typecheck": "tsc --noEmit",
  "format": "prettier --write ."
}
```

## Step 7 — Core Lib Files

Create `src/lib/db.ts`:
```ts
import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
export const db = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db
```

Create `src/lib/utils.ts`:
```ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }
```

## Step 8 — Clerk Middleware

Create `src/middleware.ts`:
```ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

const isPublicRoute = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)", "/t/(.*)"])

export default clerkMiddleware((auth, request) => {
  if (!isPublicRoute(request)) auth().protect()
})

export const config = { matcher: ["/((?!_next|.*\\..*).*)"] }
```

## Step 9 — Push DB Schema

```bash
npm run db:push
```

## Step 10 — Verify

```bash
npm run dev
```

Visit `http://localhost:3000`. Should show Clerk sign-in redirect.

## After Scaffold Is Complete

Run `/ship "feat: scaffold Next.js app with Prisma, Clerk, Pusher, shadcn"` then proceed to `/new-feature tournament-crud`.
