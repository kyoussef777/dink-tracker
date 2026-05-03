import { auth } from "@clerk/nextjs/server"
import { pusherServer } from "@/lib/pusher"

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return new Response("Unauthorized", { status: 401 })

  const body = await req.text()
  const params = new URLSearchParams(body)
  const socketId = params.get("socket_id")!
  const channel = params.get("channel_name")!

  const authResponse = pusherServer.authorizeChannel(socketId, channel, {
    user_id: userId,
  })

  return Response.json(authResponse)
}
