import "server-only"
import { normalizePhone } from "./phone"

/**
 * Thin Twilio SMS wrapper. Uses Twilio's REST API directly via fetch so we don't
 * pull in the SDK. All sends are best-effort: a failure to text one recipient
 * never throws into the caller's request path.
 *
 * Required env (set in Vercel):
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_FROM            E.164 sender number, e.g. +15551234567
 */

export function isSmsConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM
  )
}

export type SmsResult = {
  sent: number
  failed: number
  skipped: number
}

/**
 * Sends `body` to each recipient phone number. De-duplicates and normalizes
 * numbers first; un-normalizable ones count as skipped. Sends run concurrently.
 */
export async function sendBulkSms(phones: (string | null | undefined)[], body: string): Promise<SmsResult> {
  const normalized = phones.map(normalizePhone)
  const skipped = normalized.filter((p) => p === null).length
  const unique = Array.from(new Set(normalized.filter((p): p is string => p !== null)))

  if (!isSmsConfigured()) {
    // Not configured: treat as a no-op so callers (e.g. match-assignment alerts)
    // don't fail. The route layer reports this so the admin isn't misled.
    return { sent: 0, failed: 0, skipped: skipped + unique.length }
  }

  const results = await Promise.allSettled(unique.map((to) => sendOne(to, body)))
  const sent = results.filter((r) => r.status === "fulfilled").length
  const failed = results.length - sent
  return { sent, failed, skipped }
}

async function sendOne(to: string, body: string): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID!
  const token = process.env.TWILIO_AUTH_TOKEN!
  const from = process.env.TWILIO_FROM!

  const params = new URLSearchParams({ To: to, From: from, Body: body })
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw new Error(`Twilio ${res.status}: ${detail.slice(0, 200)}`)
  }
}
