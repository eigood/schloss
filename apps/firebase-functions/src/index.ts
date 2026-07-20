// apps/firebase-functions/src/index.ts
import { beforeUserCreated, beforeUserSignedIn, HttpsError } from 'firebase-functions/v2/identity'
import { handleBeforeUserCreated } from '@schloss/kern'

const cloudflareSecrets = [
  'CLOUDFLARE_ACCOUNT_ID',
  'CLOUDFLARE_D1_DB_ID',
  'CLOUDFLARE_API_TOKEN'
]

// 1. Creation Trigger: Catches and gracefully aborts new user signups if seeding fails
export const beforecreated = beforeUserCreated({
  maxInstances: 10,
  secrets: cloudflareSecrets
}, async (event) => {
  const user = event.data
  if (!user) {
    throw new HttpsError('invalid-argument', 'Missing user registration payload context.')
  }

  try {
    return await handleBeforeUserCreated(
      {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName
      },
      {
        cloudflareAccountId: process.env.CLOUDFLARE_ACCOUNT_ID || '',
        cloudflareD1DbId: process.env.CLOUDFLARE_D1_DB_ID || '',
        cloudflareApiToken: process.env.CLOUDFLARE_API_TOKEN || ''
      }
    )
  } catch (error: any) {
    console.error('Fatal: Auth Creation blocking pipeline failed:', error)

    if (error.message === 'MALFORMED_UID') {
      throw new HttpsError('invalid-argument', 'Malformed identity structure.')
    }

    // Abort the creation workflow to prevent orphaned auth accounts
    throw new HttpsError(
      'unavailable',
      'Critical database handshake failed. Registration aborted.'
    )
  }
})

// 2. Sign-In Trigger: Ensures existing sessions can evaluate claims safety states
export const beforesignedin = beforeUserSignedIn({
  maxInstances: 10,
  secrets: cloudflareSecrets
}, async (event) => {
  const user = event.data
  if (!user) {
    throw new HttpsError('invalid-argument', 'Missing user sign-in payload context.')
  }

  try {
    // If you add database-backed validation logic on sign-in (e.g., checking blocklists,
    // verifying active status in D1), wrap it inside this try-catch block.
    
    // For now, carry forward existing claims safely
    const appGuid = user.customClaims?.app_guid as string || ''
    const keyStatus = user.customClaims?.k_status as string || 'pending'

    return {
      customClaims: {
        app_guid: appGuid,
        k_status: keyStatus
      }
    }
  } catch (error: any) {
    console.error('Fatal: Auth Sign-in blocking pipeline failed:', error)
    
    // Fail safe: Block access if status or authentication states cannot be safely verified
    throw new HttpsError(
      'internal',
      'Identity state verification failed. Access denied.'
    )
  }
})

