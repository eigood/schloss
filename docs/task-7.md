# Task 7: Asset Ingestion & Envelope Seeding Pipeline

*   **Context Framework:** @schloss (Isomorphic Secure Static Asset Network Monorepo)
*   **Target Environment:** @schloss/kern (File Ingestion Layer) & @schloss/keep
*   **Dependencies:** Task 1, Task 2, Task 6

## Background Constraints
*   **Sovereignty:** The user acts strictly as a consumer; generated protected files are tailored, custom data outputs.
*   **Redundancy Engine:** The private R2 bucket functions as an absolute master cache, permitting total public file recovery.

## CONTEXT FROM COMPLETED TASKS ---

# TASK SUMMARY: @schloss/core Persistence Layer Configuration

- FILE LOCATIONS: Schema in `src/schemas.ts`, config in `drizzle.config.ts`, snapshots/SQL in `drizzle/`.
- USERS TABLE: id (PK autoinc), firebase_guid (unique text), app_guid (unique text static asset key), public_key (text), created_at (int), optional email (text), optional display_name (text).
- GROUPS TABLE: id (PK autoinc), name (unique text), key_version (int, default 1), master_key (blob mapping to Uint8Array).
- MEMBERSHIPS TABLE: id (PK autoinc), user_id (FK users.id cascade), group_id (FK groups.id cascade), optional role (text). Composite unique rule on (user_id, group_id).
- SYSTEM SCRIPTS: Workspace execution from root via `npm -w @schloss/core`. Calls `drizzle-kit generate` for differentials, and `wrangler d1 migrations apply schloss-db` (with `--local` or `--remote`) for deployment.
- DEPS POLICY: `drizzle-orm` in dependencies for edge bundling; `drizzle-kit` in devDependencies.

# TASK SUMMARY: @schloss/keep Abstract Storage Contract & R2 Plugin

- FILE LOCATIONS: Cache schema in `modules/core/src/schemas.ts`, interfaces/types in `modules/keep/src/` (`types.ts`, `interface.ts`, `index.ts`), R2 driver in `plugins/keep-r2/src/` (`r2-provider.ts`, `index.ts`).
- ASSETS TABLE: id (PK autoinc), namespace (text), key (text), hash_etag (text), size_bytes (int), last_modified (int), synced_at (int). Composite unique rule on (namespace, key).
- TYPE WRAPPERS: StorageMetadata `{ key: string, hashEtag: string, sizeBytes: number, lastModified: number }`, ListOptions `{ prefix?: string, cursor?: string, limit?: number }`, ListPage `{ items: StorageMetadata[], nextCursor?: string }`. All type definitions written entirely without trailing semicolons.
- ABSTRACT CLASS SIGNATURES: BaseStorageProvider<OptionsExtend> requiring head(key) -> Promise<StorageMetadata | null>, writeBinary(key, body, options) -> Promise<void>, readBinary(key) -> Promise<ReadableStream<Uint8Array> | null>, and list(options) -> Promise<ListPage>. Concrete mixins handled via writeJson<T>(), readText(), and readJson<T>().
- BEHAVIOR & STYLE POLICY: Missing items consistently resolve to null instead of throwing exceptions. Source formatting mandates unfolded continuous lines, zero trailing semicolons across functions or type parameters, and strictly empty lines with zero whitespace.

# TASK SUMMARY: @schloss/kern Admin Core Orchestration Engine

- FILE LOCATIONS: src/escrow.ts handles user registration and key storage, src/sign.ts manages memberships and parallel rotations, src/rekey.ts processes rekey requests
- [MAIN OBJECT] TABLE/SCHEMA: users (app_guid text unique indexed, pendingPublicKey text nullable, created_at int), memberships (user_id fk, group_id fk, role text with 'pending_rekey' state, composite unique pk on user_id and group_id), assets (namespace text, key text, hash_etag text, size_bytes int, synced_at int, composite unique pk on namespace and key)
- [SUPPORTING DATA] STRUCTURES: EscrowOnboardInput (appGuid, firebaseGuid, publicKey, keyBackup, salt, optional email, optional displayName), KeyDistributionInput (userId, appGuid, ephemeralPublicKey, encryptedMasterKey, authenticationTag, keyVersion), RekeyRequestInput (appGuid, groupId, newPublicKey, signature)
- SYSTEM LOGIC/SIGNATURES: onboardUserEscrow(db, storage, routerConfig, input) returns sliceKey and writes user metadata to hash ring, addUserToGroup(db, storage, routerConfig, groupId, targetUserId, distPayload) maps and appends encrypted group keys to target user's slice, rotateGroupKeys(db, storage, routerConfig, groupId, evictedUserId, newKeyVersion, newMasterKeyBlob, newDistributions) updates remaining users in parallel, requestUserRekey(db, input) handles client rekey handshakes
- CODE/DEPS POLICY: Strictly no trailing semicolons across files, unfolded continuous signature lines, empty lines with zero whitespace between function declarations, utilize native Drizzle batching via db.batch() for all database operations, perform transactional R2-writes-first with in-memory fallback on rollback to guarantee cross-system integrity, decouple cryptographic heavy lifting to client-side to operate within Cloudflare Free Tier 10ms limits

## Plan Segment From Master Blueprint
*   **Private R2 Bucket:** Secure, internet-isolated archive storing raw, unencrypted foundational data sources to permit recovery.
*   **Ingestion Paths (Section 6):** Directs payloads by classification type: Public Routing sends data raw to public directories. Individual Routing wraps data in a unique file DEK sealed via a user public key. Group Routing seals file DEKs via the current Group Master Key inside version-controlled folders.

## Today's Objective
Design the asset onboarding and encryption streaming pipeline inside @schloss/kern. The engine must receive data streams, save the unencrypted source assets securely to the internet-isolated private R2 bucket, evaluate security routing types, fetch the necessary keys from D1, wrap files in unique symmetric DEKs, build the metadata header wrapper packets, and commit the public asset to R2 with native cache instructions.

Please outline the data streaming architecture, envelope crypto operations, path generation parameters, and metadata pass-through mapping. Do not write any code yet.

