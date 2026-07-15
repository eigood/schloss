import { sqliteTable, integer, text, blob, unique } from 'drizzle-orm/sqlite-core'
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  firebaseGuid: text('firebase_guid').notNull().unique(),
  appGuid: text('app_guid').notNull().unique(),
  publicKey: text('public_key').notNull(),
  createdAt: integer('created_at').notNull(),
  email: text('email'),
  displayName: text('display_name')
})

export const groups = sqliteTable('groups', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  keyVersion: integer('key_version').notNull().default(1),
  masterKey: blob('master_key').$type<Uint8Array>().notNull()
})

export const memberships = sqliteTable('memberships', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  groupId: integer('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  role: text('role')
}, ({ userId, groupId }) => ({
  userGroupUniq: unique().on(userId, groupId)
}))

export const assets = sqliteTable('assets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  namespace: text('namespace').notNull(),
  key: text('key').notNull(),
  hashEtag: text('hash_etag').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  lastModified: integer('last_modified').notNull(),
  syncedAt: integer('synced_at').notNull(),
}, (table) => [
  uniqueIndex('namespace_key_idx').on(table.namespace, table.key)
]);

export type User = InferSelectModel<typeof users>
export type NewUser = InferInsertModel<typeof users>

export type Group = InferSelectModel<typeof groups>
export type NewGroup = InferInsertModel<typeof groups>

export type Membership = InferSelectModel<typeof memberships>
export type NewMembership = InferInsertModel<typeof memberships>

export type Asset = InferSelectModel<typeof assets>
export type NewAsset = InferInsertModel<typeof assets>

