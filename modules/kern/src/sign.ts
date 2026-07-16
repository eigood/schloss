import { memberships } from '@schloss/core'
import { ConfigCoordinator } from './coordinator'

export interface KeyDistributionInput {
  userId: string
  appGuid: string
  ephemeralPublicKey: string
  encryptedMasterKey: string
  authenticationTag: string
  keyVersion: number
}

export interface RekeyRequestInput {
  appGuid: string
  groupId: string
  newPublicKey: string
  signature: string
}

export async function addUserToGroup(
  db: any,
  coordinator: ConfigCoordinator,
  groupId: string,
  targetUserId: string,
  distPayload: KeyDistributionInput
): Promise<void> {
  const dbOps = [
    db.insert(memberships).values({
      userId: targetUserId,
      groupId: groupId,
      role: 'active'
    })
  ]

  await coordinator.mutateAndCommit(
    (draftConfig) => {
      const targetSliceId = '42'
      const sliceMeta = draftConfig.slices[targetSliceId]
      if (sliceMeta) {
        sliceMeta.assetCount = (sliceMeta.assetCount || 0) + 1
      }
      return draftConfig
    },
    dbOps
  )
}

export async function rotateGroupKeys(
  db: any,
  coordinator: ConfigCoordinator,
  groupId: string,
  evictedUserId: string | null,
  newKeyVersion: number,
  newMasterKeyBlob: string,
  newDistributions: KeyDistributionInput[]
): Promise<void> {
  const config = await coordinator.getConfig()
  const router = await coordinator.getRouter()

  // 1. Group distributions by slice for efficient, idempotent pre-flight R2 updates
  const distributionsBySlice = newDistributions.reduce((acc, dist) => {
    const sliceKey = router.resolveSliceFileKey(dist.appGuid, config)
    if (sliceKey) {
      if (!acc[sliceKey]) acc[sliceKey] = []
      acc[sliceKey].push(dist)
    }
    return acc
  }, {} as Record<string, KeyDistributionInput[]>)

  // 2. Pre-flight: Idempotent slice mutations
  // If this fails, no DB ops have occurred. Retry logic is internal to this method.
  for (const [sliceKey, dists] of Object.entries(distributionsBySlice)) {
    await coordinator.mutateAndCommitSlice<SliceStripePayload>(
      sliceKey,
      (currentSlice) => {
        if (!currentSlice) return currentSlice
        for (const dist of dists) {
          if (currentSlice.profiles[dist.appGuid]) {
            currentSlice.profiles[dist.appGuid].metadata = {
              ...currentSlice.profiles[dist.appGuid].metadata,
              masterKey: newMasterKeyBlob,
              keyVersion: newKeyVersion
            }
          }
        }
        return currentSlice
      },
      [] // No DB ops executed here
    )
  }

  // 3. Finalize: Atomic global config update + batch DB operations
  // This block is retried automatically by the coordinator on 412 conflicts.
  const finalDbOps = newDistributions.map((dist) => 
    db.update(memberships)
      .set({ role: 'active' })
      .where(sql`user_id = ${dist.userId} AND group_id = ${groupId}`)
  )

  if (evictedUserId) {
    finalDbOps.push(
      db.delete(memberships)
        .where(sql`user_id = ${evictedUserId} AND group_id = ${groupId}`)
    )
  }

  await coordinator.mutateAndCommit(
    (draftConfig) => {
      if (draftConfig.groupKeyDistribution[groupId]) {
        draftConfig.groupKeyDistribution[groupId].keyVersion = newKeyVersion
      }
      return draftConfig
    },
    finalDbOps
  )
}
