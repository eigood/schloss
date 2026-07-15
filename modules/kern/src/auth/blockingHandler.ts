import * as crypto from 'crypto'

export interface BlockingHandlerConfig {
  cloudflareAccountId: string
  cloudflareD1DbId: string
  cloudflareApiToken: string
}

export interface UserInput {
  uid: string
  email?: string
  displayName?: string
}

export interface BlockingHandlerResult {
  customClaims: {
    app_guid: string
    k_status: string
  }
}

function sanitizeInput(val: string | undefined, pattern: RegExp, maxLen = 128): string | null {
  if (!val) return null
  const trimmed = val.trim()
  if (trimmed.length > maxLen || !pattern.test(trimmed)) {
    return null
  }
  return trimmed
}

// Static, raw SQL query matching the D1 schema without importing the D1 ORM directly
const SEED_USER_SQL = 'INSERT INTO users (firebase_guid, app_guid, created_at, email, display_name) VALUES (?, ?, ?, ?, ?) ON CONFLICT (firebase_guid) DO UPDATE SET email = COALESCE(excluded.email, users.email), display_name = COALESCE(excluded.display_name, users.display_name)'

/**
 * Invoked during the beforeUserCreated workflow.
 * Seeds the database directly over REST and returns initial claims.
 */
export async function handleBeforeUserCreated(
  user: UserInput,
  config: BlockingHandlerConfig
): Promise<BlockingHandlerResult> {
  const firebaseGuid = sanitizeInput(user.uid, /^[a-zA-Z0-9_-]{28,128}$/)
  if (!firebaseGuid) {
    throw new Error('MALFORMED_UID')
  }

  const email = sanitizeInput(user.email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/, 256)?.toLowerCase()
  const displayName = sanitizeInput(user.displayName, /^[\p{L}\p{N}\s'\-.,]+$/u, 100)

  // Generates 16 bytes of entropy -> encodes to a 22-char URL-safe base64 string
  const rawBytes = crypto.randomBytes(16)
  const appGuid = rawBytes.toString('base64url')

  const d1Endpoint = `https://api.cloudflare.com/client/v4/accounts/${config.cloudflareAccountId}/d1/database/${config.cloudflareD1DbId}/query`
  const createdAtEpoch = Math.floor(Date.now() / 1000)

  const sqlPayload = {
    sql: SEED_USER_SQL,
    params: [
      firebaseGuid,
      appGuid,
      createdAtEpoch,
      email ?? null,
      displayName ?? null
    ]
  }

  const response = await fetch(d1Endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.cloudflareApiToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(sqlPayload)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`D1_HTTP_ERROR Status ${response.status} - ${errorText}`)
  }

  const jsonResult = await response.json() as any
  if (!jsonResult.success) {
    throw new Error('D1_QUERY_FAILED')
  }

  return {
    customClaims: {
      app_guid: appGuid,
      k_status: 'pending'
    }
  }
}

/**
 * Invoked during the beforeUserSignedIn workflow.
 * Syncs, updates, or validates the user's latest claim properties before sign-in is resolved.
 */
export async function handleBeforeUserSignedIn(
  user: UserInput,
  existingClaims: Record<string, any> | undefined,
  config: BlockingHandlerConfig
): Promise<BlockingHandlerResult> {
  const firebaseGuid = sanitizeInput(user.uid, /^[a-zA-Z0-9_-]{28,128}$/)
  if (!firebaseGuid) {
    throw new Error('MALFORMED_UID')
  }

  // Get current claims from the event context or prepare a fallback
  const appGuid = existingClaims?.app_guid as string || ''
  const currentKeyStatus = existingClaims?.k_status as string || 'pending'

  // Future phase extension point:
  // You can execute a quick GET query against D1 here to check if the user's
  // active cryptographic key has been registered, allowing you to update
  // k_status to 'active' on subsequent logins.

  return {
    customClaims: {
      app_guid: appGuid,
      k_status: currentKeyStatus
    }
  }
}

