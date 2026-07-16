import { HashRingRouter } from '@schloss/keep'
import type { BaseStorageProvider } from '@schloss/keep'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import { users, assets } from '@schloss/core/schemas'
import { eq } from 'drizzle-orm'

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
  db: DrizzleD1Database<any>,
  storage: BaseStorageProvider<any>,
  routerConfig: any,
  input: EscrowOnboardInput
): Promise<{ success: boolean; sliceKey: string }> {
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

  const router = new HashRingRouter({
    storagePrefix: routerConfig.storagePrefix || 'slices',
    maxSliceByteSize: routerConfig.maxSliceByteSize || 1048576,
    vnodeFactor: routerConfig.vnodeFactor || 40,
    maxProfilesPerSlice: routerConfig.maxProfilesPerSlice || 500
  })

  const sliceFileName = router.resolveSliceFileName(input.appGuid, routerConfig)
  if (!sliceFileName) {
    throw new Error('Could not resolve slice location for App GUID')
  }

  const sliceKey = `${routerConfig.storagePrefix || 'slices'}/${sliceFileName}`

  const existingSliceData = await storage.readJson<any>(sliceKey)
  const slicePayload = existingSliceData || {
    sliceId: sliceFileName.replace('.json', ''),
    generatedAt: Math.floor(Date.now() / 1000),
    profiles: {},
    groupKeyDistribution: {}
  }

  slicePayload.profiles[input.appGuid] = {
    appGuid: input.appGuid,
    firebaseGuid: input.firebaseGuid,
    publicKey: input.publicKey,
    createdAt: Math.floor(Date.now() / 1000),
    metadata: {
      email: input.email || null,
      displayName: input.displayName || null
    }
  }

  const sliceString = JSON.stringify(slicePayload)
  const sliceBytes = new TextEncoder().encode(sliceString)
  const hashBuffer = await crypto.subtle.digest('SHA-256', sliceBytes)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const calculatedEtag = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

  await storage.writeBinary(sliceKey, sliceBytes, {
    contentType: 'application/json'
  })

  try {
    const dbOperations: any[] = []

    if (existingUser) {
      dbOperations.push(
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
      dbOperations.push(
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

    dbOperations.push(
      db.insert(assets).values({
        namespace: 'profiles',
        key: sliceKey,
        hashEtag: calculatedEtag,
        sizeBytes: sliceBytes.byteLength,
        syncedAt: Math.floor(Date.now() / 1000)
      }).onConflictDoUpdate({
        target: [assets.namespace, assets.key],
        set: {
          hashEtag: calculatedEtag,
          sizeBytes: sliceBytes.byteLength,
          syncedAt: Math.floor(Date.now() / 1000)
        }
      })
    )

    await db.batch(dbOperations as any)
  } catch (dbError) {
    if (existingSliceData) {
      const rollbackBytes = new TextEncoder().encode(JSON.stringify(existingSliceData))
      await storage.writeBinary(sliceKey, rollbackBytes, { contentType: 'application/json' })
    } else {
      await storage.delete?.(sliceKey)
    }
    throw dbError
  }

  return { success: true, sliceKey }
}

