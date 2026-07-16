import { HashRingRouter } from '@schloss/keep'
import type { BaseStorageProvider } from '@schloss/keep'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import { users, groups, memberships, assets } from '@schloss/core/schemas'
import { eq, and } from 'drizzle-orm'

export interface KeyDistributionInput {
  userId: number
  appGuid: string
  ephemeralPublicKey: string
  encryptedMasterKey: string
  authenticationTag: string
  keyVersion: number
}

export async function addUserToGroup(
  db: DrizzleD1Database<any>,
  storage: BaseStorageProvider<any>,
  routerConfig: any,
  groupId: number,
  targetUserId: number,
  distPayload: Omit<KeyDistributionInput, 'userId'>
): Promise<{ success: boolean }> {
  const [targetUser] = await db.select()
    .from(users)
    .where(eq(users.id, targetUserId))
    .limit(1)

  if (!targetUser) {
    throw new Error('Target user does not exist')
  }

  const router = new HashRingRouter({
    storagePrefix: routerConfig.storagePrefix || 'slices',
    maxSliceByteSize: routerConfig.maxSliceByteSize || 1048576,
    vnodeFactor: routerConfig.vnodeFactor || 40,
    maxProfilesPerSlice: routerConfig.maxProfilesPerSlice || 500
  })

  const sliceFileName = router.resolveSliceFileName(targetUser.appGuid, routerConfig)
  if (!sliceFileName) {
    throw new Error('Failed to resolve target user slice file')
  }

  const sliceKey = `${routerConfig.storagePrefix || 'slices'}/${sliceFileName}`
  const existingSliceData = await storage.readJson<any>(sliceKey)
  if (!existingSliceData) {
    throw new Error('Target user slice does not exist in storage')
  }

  if (!existingSliceData.groupKeyDistribution[targetUser.id]) {
    existingSliceData.groupKeyDistribution[targetUser.id] = []
  }

  existingSliceData.groupKeyDistribution[targetUser.id].push({
    groupId,
    keyVersion: distPayload.keyVersion,
    ephemeralPublicKey: distPayload.ephemeralPublicKey,
    encryptedMasterKey: distPayload.encryptedMasterKey,
    authenticationTag: distPayload.authenticationTag
  })

  const sliceString = JSON.stringify(existingSliceData)
  const sliceBytes = new TextEncoder().encode(sliceString)
  const hashBuffer = await crypto.subtle.digest('SHA-256', sliceBytes)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const calculatedEtag = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

  await storage.writeBinary(sliceKey, sliceBytes, {
    contentType: 'application/json'
  })

  try {
    await db.batch([
      db.insert(memberships).values({
        userId: targetUserId,
        groupId,
        role: 'member'
      }),
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
    ])
  } catch (dbError) {
    const rollbackBytes = new TextEncoder().encode(JSON.stringify(existingSliceData))
    await storage.writeBinary(sliceKey, rollbackBytes, { contentType: 'application/json' })
    throw dbError
  }

  return { success: true }
}

export async function rotateGroupKeys(
  db: DrizzleD1Database<any>,
  storage: BaseStorageProvider<any>,
  routerConfig: any,
  groupId: number,
  evictedUserId: number,
  newKeyVersion: number,
  newMasterKeyBlob: Uint8Array,
  newDistributions: KeyDistributionInput[]
): Promise<{ success: boolean }> {
  const router = new HashRingRouter({
    storagePrefix: routerConfig.storagePrefix || 'slices',
    maxSliceByteSize: routerConfig.maxSliceByteSize || 1048576,
    vnodeFactor: routerConfig.vnodeFactor || 40,
    maxProfilesPerSlice: routerConfig.maxProfilesPerSlice || 500
  })

  const distributionsBySlice: Record<string, { sliceKey: string; items: KeyDistributionInput[] }> = {}

  for (const dist of newDistributions) {
    const sliceFileName = router.resolveSliceFileName(dist.appGuid, routerConfig)
    if (!sliceFileName) continue
    const sliceKey = `${routerConfig.storagePrefix || 'slices'}/${sliceFileName}`
    
    if (!distributionsBySlice[sliceKey]) {
      distributionsBySlice[sliceKey] = { sliceKey, items: [] }
    }
    distributionsBySlice[sliceKey].items.push(dist)
  }

  const rolledBackBackupSlices: Record<string, string> = {}
  const modifiedSlices: Array<{ sliceKey: string; etag: string; size: number }> = []

  try {
    await Promise.all(
      Object.keys(distributionsBySlice).map(async (sliceKey) => {
        const sliceData = distributionsBySlice[sliceKey]
        const existingSliceRaw = await storage.readText?.(sliceKey) || null
        
        if (existingSliceRaw) {
          rolledBackBackupSlices[sliceKey] = existingSliceRaw
        }

        const slicePayload = existingSliceRaw ? JSON.parse(existingSliceRaw) : {
          sliceId: sliceKey.split('/').pop()?.replace('.json', '') || 'unknown',
          generatedAt: Math.floor(Date.now() / 1000),
          profiles: {},
          groupKeyDistribution: {}
        }

        for (const dist of sliceData.items) {
          slicePayload.groupKeyDistribution[dist.userId] = (slicePayload.groupKeyDistribution[dist.userId] || [])
            .filter((val: any) => val.groupId !== groupId)

          slicePayload.groupKeyDistribution[dist.userId].push({
            groupId,
            keyVersion: newKeyVersion,
            ephemeralPublicKey: dist.ephemeralPublicKey,
            encryptedMasterKey: dist.encryptedMasterKey,
            authenticationTag: dist.authenticationTag
          })
        }

        const sliceString = JSON.stringify(slicePayload)
        const sliceBytes = new TextEncoder().encode(sliceString)
        const hashBuffer = await crypto.subtle.digest('SHA-256', sliceBytes)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        const calculatedEtag = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

        await storage.writeBinary(sliceKey, sliceBytes, {
          contentType: 'application/json'
        })

        modifiedSlices.push({
          sliceKey,
          etag: calculatedEtag,
          size: sliceBytes.byteLength
        })
      })
    )
  } catch (writeError) {
    await Promise.all(
      Object.keys(rolledBackBackupSlices).map(async (sliceKey) => {
        const fallbackBytes = new TextEncoder().encode(rolledBackBackupSlices[sliceKey])
        await storage.writeBinary(sliceKey, fallbackBytes, { contentType: 'application/json' })
      })
    )
    throw writeError
  }

  try {
    const dbOperations: any[] = [
      db.delete(memberships)
        .where(and(eq(memberships.groupId, groupId), eq(memberships.userId, evictedUserId))),
      db.update(groups)
        .set({ keyVersion: newKeyVersion, masterKey: newMasterKeyBlob })
        .where(eq(groups.id, groupId))
    ]

    for (const mod of modifiedSlices) {
      dbOperations.push(
        db.insert(assets).values({
          namespace: 'profiles',
          key: mod.sliceKey,
          hashEtag: mod.etag,
          sizeBytes: mod.size,
          syncedAt: Math.floor(Date.now() / 1000)
        }).onConflictDoUpdate({
          target: [assets.namespace, assets.key],
          set: {
            hashEtag: mod.etag,
            sizeBytes: mod.size,
            syncedAt: Math.floor(Date.now() / 1000)
          }
        })
      )
    }

    await db.batch(dbOperations as any)
  } catch (dbError) {
    await Promise.all(
      Object.keys(rolledBackBackupSlices).map(async (sliceKey) => {
        const fallbackBytes = new TextEncoder().encode(rolledBackBackupSlices[sliceKey])
        await storage.writeBinary(sliceKey, fallbackBytes, { contentType: 'application/json' })
      })
    )
    throw dbError
  }

  return { success: true }
}

