import { eq } from 'drizzle-orm'
import { users } from '@schloss/core'
import { ConfigCoordinator } from './coordinator'
import { SliceStripePayload } from './types'

export interface EscrowOnboardInput {
  appGuid: string
  firebaseGuid: string
  publicKey: string
  keyBackup: string
  salt: string
  email?: string
  displayName?: string
}

export async function onboardUserEscrow(
  db: any,
  coordinator: ConfigCoordinator,
  input: EscrowOnboardInput
): Promise<string> {

  const [existingUser] = await db.select()
    .from(users)
    .where(eq(users.appGuid, input.appGuid))
    .limit(1)

  const isFullyOnboarded = existingUser && 
    existingUser.publicKey && 
    !existingUser.publicKey.startsWith('MOCK_')

  if (isFullyOnboarded) {
    throw new Error('User identity is already fully onboarded')
  }

  const config = await coordinator.getConfig()
  const router = await coordinator.getRouter()

  const sliceKey = router.resolveSliceFileKey(input.appGuid, config)
  if (!sliceKey) {
    throw new Error('Could not resolve target slice for user allocation')
  }

  const dbOps = []

  if (existingUser) {
    dbOps.push(
      db.update(users)
        .set({
          publicKey: input.publicKey,
          keyBackup: input.keyBackup,
          salt: input.salt,
          email: input.email || existingUser.email,
          displayName: input.displayName || existingUser.displayName
        })
        .where(eq(users.id, existingUser.id))
    )
  } else {
    dbOps.push(
      db.insert(users).values({
        firebaseGuid: input.firebaseGuid,
        appGuid: input.appGuid,
        publicKey: input.publicKey,
        createdAt: Math.floor(Date.now() / 1000),
        email: input.email || null,
        displayName: input.displayName || null,
        keyBackup: input.keyBackup,
        salt: input.salt
      })
    )
  }

  await coordinator.mutateAndCommitSlice<SliceStripePayload>(
    sliceKey,
    (currentSlice) => {
      const draftSlice: SliceStripePayload = currentSlice ?? {
        sliceId: router.resolveSliceFileName(input.appGuid, config) || '0',
        generatedAt: Math.floor(Date.now() / 1000),
        profiles: {}
      }

      draftSlice.profiles[input.appGuid] = {
        appGuid: input.appGuid,
        firebaseGuid: input.firebaseGuid,
        publicKey: input.publicKey,
        createdAt: Math.floor(Date.now() / 1000),
        metadata: {
          email: input.email,
          displayName: input.displayName
        }
      }

      return draftSlice
    },
    dbOps
  )

  return sliceKey
}
