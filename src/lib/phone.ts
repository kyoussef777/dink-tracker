/**
 * Normalize a free-text phone number to E.164. Returns null if it can't be
 * confidently normalized (so callers can skip it rather than send garbage).
 * Assumes US (+1) for 10-digit numbers when no country code is present.
 *
 * Pure / isomorphic — kept separate from sms.ts (which is server-only) so it
 * can be unit-tested and reused on the client.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (trimmed.startsWith("+")) {
    const digits = trimmed.slice(1).replace(/\D/g, "")
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null
  }
  const digits = trimmed.replace(/\D/g, "")
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`
  return null
}
