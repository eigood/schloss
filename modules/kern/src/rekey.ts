import type { DrizzleD1Database } from 'drizzle-orm/d1'
import { users, memberships } from '@schloss/core/src/schemas'
import { eq, and } from 'drizzle-orm'

export interface RekeyRequestInput {
  appGuid: string
  groupId: number
  newPublicKey: string
  signature: string
}

export async function requestUserRekey(
  db: DrizzleD1Database<any>,
  input: RekeyRequestInput
): Promise<{ success: boolean; status: string }> {
  const [user] = await db.select()
    .from(users)
    .where(eq(users.appGuid, input.appGuid))
    .limit(1)

  if (!user) {
    throw new Error('User identity not found')
  }

  const [membership] = await db.select()
    .from(memberships)
    .where(and(
      eq(memberships.userId, user.id),
      eq(memberships.groupId, input.groupId)
    ))
    .limit(1)

  if (!membership) {
    throw new Error('User does not belong to the target security group')
  }

  await db.batch([
    db.update(memberships)
      .set({
        role: 'pending_rekey'
      })
      .where(and(
        eq(memberships.userId, user.id),
        eq(memberships.groupId, input.groupId)
      )),
    db.update(users)
      .set({
        pendingPublicKey: input.newPublicKey
      })
      .where(eq(users.id, user.id))
  ])

  return { success: true, status: 'rotation_pending' }
}

