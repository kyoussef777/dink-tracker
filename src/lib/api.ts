import { auth } from "@clerk/nextjs/server"
import { ZodError, type ZodSchema } from "zod"

/** Returns the authenticated user's id, or a Response that should be returned immediately. */
export async function requireUser(): Promise<string | Response> {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })
  return userId
}

/** Parses + validates a request JSON body, or returns an error Response. */
export async function parseBody<T>(req: Request, schema: ZodSchema<T>): Promise<T | Response> {
  try {
    const json = await req.json()
    return schema.parse(json)
  } catch (err) {
    if (err instanceof ZodError) {
      return Response.json({ error: err.errors.map((e) => e.message).join(", ") }, { status: 400 })
    }
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }
}
