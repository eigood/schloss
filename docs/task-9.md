# Task 9: System Topography Initialization & Configuration Layer

* Context Framework: @schloss (Isomorphic Secure Static Asset Network Monorepo)
* Target Environment: @schloss/kern (Modifying src/escrow.ts and src/sign.ts)
* Dependencies: Task 2 (Storage Provider Interface), Task 3 (Hash Ring Schema), Task 6 (Admin Core Orchestration Engine)

## Background Constraints
* Engine Integration: This task directly patches your existing core business engines inside modules/kern/. It does not create a new standalone package.
* Cross-Worker Synchronization: Multiple serverless execution containers will run concurrently across the edge. The engine must actively detect if an external worker instance has pushed a newer config.json file to R2, instantly invalidating its local memory singleton.
* Concurrency Control: To prevent two workers from clobbering each other during simultaneous modifications (such as two administrators adding different groups at the exact same time), all write mutations must utilize an Optimistic Concurrency Control (OCC) pattern backed by strict validation tracking.

## CONTEXT FROM COMPLETED TASKS ---

# TASK SUMMARY: @schloss/keep Abstract Storage Contract & R2 Plugin

- FILE LOCATIONS: Cache schema in `modules/core/src/schemas.ts`, interfaces/types in `modules/keep/src/` (`types.ts`, `interface.ts`, `index.ts`), R2 driver in `plugins/keep-r2/src/` (`r2-provider.ts`, `index.ts`).
- ASSETS TABLE: id (PK autoinc), namespace (text), key (text), hash_etag (text), size_bytes (int), last_modified (int), synced_at (int). Composite unique rule on (namespace, key).
- TYPE WRAPPERS: StorageMetadata `{ key: string, hashEtag: string, sizeBytes: number, lastModified: number }`, ListOptions `{ prefix?: string, cursor?: string, limit?: number }`, ListPage `{ items: StorageMetadata[], nextCursor?: string }`. All type definitions written entirely without trailing semicolons.
- ABSTRACT CLASS SIGNATURES: BaseStorageProvider<OptionsExtend> requiring head(key) -> Promise<StorageMetadata | null>, writeBinary(key, body, options) -> Promise<void>, readBinary(key) -> Promise<ReadableStream<Uint8Array> | null>, and list(options) -> Promise<ListPage>. Concrete mixins handled via writeJson<T>(), readText(), and readJson<T>().
- BEHAVIOR & STYLE POLICY: Missing items consistently resolve to null instead of throwing exceptions. Source formatting mandates unfolded continuous lines, zero trailing semicolons across functions or type parameters, and strictly empty lines with zero whitespace.

# TASK SUMMARY: @schloss/keep & @schloss/core Routing Schema & Path Routing Matrix

- FILE LOCATIONS: Config and slice schemas in `@schloss/core/src/schemas.ts`, path router engine in `@schloss/keep/src/paths.ts`
- HASH RING SCHEMA: HashRingConfig mapping algorithm (text), vnodeFactor (int), sliceCount (int), ringTokens (int array), ringSliceIndices (int array), and a slices dictionary tracking sliceId, fileName, assetCount, and hashEtag
- USER PROFILE & KEY STRUCTURES: SliceStripePayload storing sliceId, generatedAt, profiles index mapping appGuid to UserProfilePayload (containing appGuid, firebaseGuid, publicKey, createdAt, metadata), and groupKeyDistribution index mapping groupId to keyVersion and members list (containing userId, keyVersion, ephemeralPublicKey, encryptedMasterKey, authenticationTag)
- SYSTEM LOGIC/SIGNATURES: murmurHash3(key: string) -> number, bootstrapEmptyConfig(sliceCount, vnodeFactor) -> HashRingConfig, HashRingRouter class with constructor(options: HashRingRouterOptions) initializing storagePrefix, maxSliceByteSize, vnodeFactor, and maxProfilesPerSlice, getConfigFileKey() -> string, resolveSliceFileName(appGuid, config) -> string | null, resolveSliceFileKey(appGuid, config) -> string | null
- CODE/DEPS POLICY: Absolute zero trailing semicolons across files, unfolded continuous lines for signatures and simple logic, strictly empty lines with zero whitespace between function definitions, missing or invalid lookup resolutions consistently return null instead of throwing exceptions, cold-start initialization handling via empty ring bootstrapping, externalized configuration boundaries for scale tuning, and dynamic storage prefix resolution

# TASK SUMMARY: @schloss/kern Admin Core Orchestration Engine

- FILE LOCATIONS: src/escrow.ts handles user registration and key storage, src/sign.ts manages memberships and parallel rotations, src/rekey.ts processes rekey requests
- [MAIN OBJECT] TABLE/SCHEMA: users (app_guid text unique indexed, pendingPublicKey text nullable, created_at int), memberships (user_id fk, group_id fk, role text with 'pending_rekey' state, composite unique pk on user_id and group_id), assets (namespace text, key text, hash_etag text, size_bytes int, synced_at int, composite unique pk on namespace and key)
- [SUPPORTING DATA] STRUCTURES: EscrowOnboardInput (appGuid, firebaseGuid, publicKey, keyBackup, salt, optional email, optional displayName), KeyDistributionInput (userId, appGuid, ephemeralPublicKey, encryptedMasterKey, authenticationTag, keyVersion), RekeyRequestInput (appGuid, groupId, newPublicKey, signature)
- SYSTEM LOGIC/SIGNATURES: onboardUserEscrow(db, storage, routerConfig, input) returns sliceKey and writes user metadata to hash ring, addUserToGroup(db, storage, routerConfig, groupId, targetUserId, distPayload) maps and appends encrypted group keys to target user's slice, rotateGroupKeys(db, storage, routerConfig, groupId, evictedUserId, newKeyVersion, newMasterKeyBlob, newDistributions) updates remaining users in parallel, requestUserRekey(db, input) handles client rekey handshakes
- CODE/DEPS POLICY: Strictly no trailing semicolons across files, unfolded continuous signature lines, empty lines with zero whitespace between function declarations, utilize native Drizzle batching via db.batch() for all database operations, perform transactional R2-writes-first with in-memory fallback on rollback to guarantee cross-system integrity, decouple cryptographic heavy lifting to client-side to operate within Cloudflare Free Tier 10ms limits

## Plan Segment From Master Blueprint
* The Manifest Phase: Handles master system configuration file structures (config.json), generating initial hash ring arrays, token positions, and global group key version tracking maps.
* Mobile & Cache Optimization: Leverages native edge caching mechanics. The base layer passes explicit cache metadata instructions downstream so the static network layer naturally absorbs the high read volume.

## Today's Objective
Design the specific modifications required inside @schloss/kern/src/escrow.ts and src/sign.ts to integrate a multi-worker synchronized, edge-cached reading and writing layer for the global config.json routing topology.

Plan out how these existing modules:
1. Implement Synchronized In-Memory Caching: Structure a reading wrapper that stores both the parsed config.json data object and its storage-provided validation identifier in a local JavaScript global scope singleton. On every subsequent read, the wrapper performs a lightweight metadata check against the backing store (leveraging standard conditional markers). If the store indicates no change, the engine trusts its 0ms in-memory cache. If it returns a new payload, the local cache is instantly overwritten.
2. Intercept the Cold Start: Detect an uninitialized bucket state (R2 storage miss combined with a local cache miss), and automatically seed a default, balanced, blank ring topology array (mapping default virtual node positions to raw empty slice skeletons) to establish the initial global baseline.
3. Modify Escrow Operations (escrow.ts): Update the onboarding script to execute its hash ring routing math using the cached configuration object, preventing an unnecessary storage read call on every single user onboarding request.
4. Execute Optimistic Concurrency Writes (sign.ts): Modify write mutations so they follow a strict Read-Modify-Write transaction sequence. When committing an update to config.json, the storage driver must provide the identifier collected during the initial read phase. If an external worker modified the file in the interim, the backing store must reject the write, prompting the current worker to refresh its cache and safely re-run its orchestration logic.
5. Enforce Write-Through Mesh Invalidation: Ensure that whenever a state change succeeds, the engine updates its local in-memory singleton and immediately purges local caching indicators, ensuring subsequent requests hitting the edge mesh witness the new state.

Please outline the precise operational sequence for these internal engine modifications, the data synchronization wrappers across multi-worker instances, and the step-by-step exception recovery path when an optimistic concurrency write collision is detected. Do not write any code yet.

