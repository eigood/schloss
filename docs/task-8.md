# Task 8: Web Crypto Runtime Decryption Engine

*   **Context Framework:** @schloss (Isomorphic Secure Static Asset Network Monorepo)
*   **Target Environment:** @schloss/gate (src/decrypt.ts) & @schloss/core (src/ciphers.ts)
*   **Dependencies:** Task 2, Task 3, Task 5, Task 6, Task 7

## Background Constraints
*   **Optimization Target:** Tailored to prevent thread blockages or memory leaks on low-powered, legacy mobile browsers.
*   **Processing Foundation:** Leverages native browser C++ compiled implementations via window.crypto.subtle.

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
- SYSTEM LOGIC/SIGNATURES: murmurHash3(key: string) -> number, HashRingRouter class with constructor(options: HashRingRouterOptions) initializing storagePrefix, maxSliceByteSize, vnodeFactor, and maxProfilesPerSlice, getConfigFileKey() -> string, resolveSliceFileName(appGuid, config) -> string | null, resolveSliceFileKey(appGuid, config) -> string | null
- CODE/DEPS POLICY: Absolute zero trailing semicolons across files, unfolded continuous lines for signatures and simple logic, strictly empty lines with zero whitespace between function definitions, missing or invalid lookup resolutions consistently return null instead of throwing exceptions, externalized configuration boundaries for scale tuning, and dynamic storage prefix resolution

# TASK SUMMARY: Client Cryptographic Identity Gateway (@schloss/gate)

- FILE LOCATIONS: package.json (workspace package configuration), tsconfig.json (workspace compiler configuration), src/types.ts (shared cryptographic payload definitions), src/index.ts (unified public export gateway), src/auth.ts (client-side state and key derivation engine), src/middleware.ts (server-side Firebase token validation edge middleware), src/components/SchlossAuth.astro (pure custom element static layout), src/components/SchlossAuthElement.ts (dynamic DOM logic and state router)
- [MAIN OBJECT] TABLE/SCHEMA: SchlossAuthEngine Custom HTML Elements comprising the parent controller 'schloss-auth-engine' and the sub-screens 'schloss-screen-locked', 'schloss-screen-onboard', 'schloss-screen-unlock', 'schloss-screen-link', 'schloss-screen-pending', and 'schloss-screen-dashboard' all styled and toggled in the Light DOM using the 'active' attribute boolean flag
- [SUPPORTING DATA] STRUCTURES: AuthState (union of string constants 'unprovisioned', 'active', 'pending_approval', 'locked'), UserRegistrationPacket (structure holding keyBackup JsonWebKey and salt string), EscrowBundle (structure holding keyBackup JsonWebKey, salt string, and appGuid string), AuthenticatedContext (structure holding uid string, optional email string, and optional appGuid string), SchlossState (structure holding status AuthState and optional appGuid string)
- SYSTEM LOGIC/SIGNATURES: SchlossAuthEngine methods including boot (resolves token to state), onboard (derives keys and registers credentials), unlock (recovers keys from local salt cache), linkDevice (downloads and restores escrow keys), requestAdminGatedRekey (triggers rotation request), and clearSession (flushes active memory key material); Middleware functions including decodeJwt (inspects payload), verifyFirebaseJwt (verifies token via Google JWKs using Web Crypto), and guard (higher-order route protector returning standard HTTP Responses)
- CODE/DEPS POLICY: Strictly no trailing semicolons; all constant strings must use single quotes; blank lines required between functions; no folding of long statements; zero pre-compilation steps in the workspace package distributing raw TypeScript/Astro source files directly; the SchlossAuth Astro component must fail fast at compilation if apiBaseUrl or cdnBaseUrl are omitted; no static element IDs permitted in markup

# TASK SUMMARY: @schloss/kern Admin Core Orchestration Engine

- FILE LOCATIONS: src/escrow.ts handles user registration and key storage, src/sign.ts manages memberships and parallel rotations, src/rekey.ts processes rekey requests
- [MAIN OBJECT] TABLE/SCHEMA: users (app_guid text unique indexed, pendingPublicKey text nullable, created_at int), memberships (user_id fk, group_id fk, role text with 'pending_rekey' state, composite unique pk on user_id and group_id), assets (namespace text, key text, hash_etag text, size_bytes int, synced_at int, composite unique pk on namespace and key)
- [SUPPORTING DATA] STRUCTURES: EscrowOnboardInput (appGuid, firebaseGuid, publicKey, keyBackup, salt, optional email, optional displayName), KeyDistributionInput (userId, appGuid, ephemeralPublicKey, encryptedMasterKey, authenticationTag, keyVersion), RekeyRequestInput (appGuid, groupId, newPublicKey, signature)
- SYSTEM LOGIC/SIGNATURES: onboardUserEscrow(db, storage, routerConfig, input) returns sliceKey and writes user metadata to hash ring, addUserToGroup(db, storage, routerConfig, groupId, targetUserId, distPayload) maps and appends encrypted group keys to target user's slice, rotateGroupKeys(db, storage, routerConfig, groupId, evictedUserId, newKeyVersion, newMasterKeyBlob, newDistributions) updates remaining users in parallel, requestUserRekey(db, input) handles client rekey handshakes
- CODE/DEPS POLICY: Strictly no trailing semicolons across files, unfolded continuous signature lines, empty lines with zero whitespace between function declarations, utilize native Drizzle batching via db.batch() for all database operations, perform transactional R2-writes-first with in-memory fallback on rollback to guarantee cross-system integrity, decouple cryptographic heavy lifting to client-side to operate within Cloudflare Free Tier 10ms limits

# TASK SUMMARY: @schloss/kern Asset Ingestion & Envelope Seeding Pipeline

- FILE LOCATIONS: src/types.ts for ingestion and envelope type definitions, src/ingest.ts for the core parallelized streaming ingestion orchestrator, d1 schema updates in packages/schloss-core/src/schemas.ts
- ASSETS TABLE/SCHEMA: id (integer, PK auto-increment), namespace (text, not null), key (text, not null), hash_etag (text, not null), size_bytes (integer, not null), synced_at (integer, not null), routing_type (text, not null), storage_class (text, not null, default 'archived'), generation_source (text, nullable), generation_params (text/json, nullable), is_dirty (integer/boolean, not null, default false), composite unique index on (namespace, key)
- SUPPORTING DATA STRUCTURES: StorageClass union ('archived' | 'generated'), RoutingType union ('public' | 'individual' | 'group'), GenerationRecipe interface (source string, params record), IngestionInput interface (namespace, key, routingType, storageClass, payloadStream, targetId, optional generation), IngestionResult interface (publicPath, sizeBytes, hashEtag)
- SYSTEM LOGIC/SIGNATURES: ingestAsset(db, privateStorage, publicStorage, input) orchestrates dual-stream teeing and writes, wrapIndividualKey(db, targetId, dek, ivEnvelope) performs client public key lookup and ECDH-derived AES-GCM wrapping, wrapGroupKey(db, targetId, dek, ivEnvelope) fetches active group master key and performs symmetric wrapping, buildEnvelopeHeader(routingType, keyVersion, ivEnvelope, ivData, envelopedDek) builds the binary metadata prefix
- CODE/DEPS POLICY: Strictly no trailing semicolons across files, use Web Crypto APIs exclusively for cryptographic operations, perform stream processing in parallel using ReadableStream.tee and Promise.all to preserve backpressure without memory bloat, implement atomic rollback deletes on private storage if subsequent steps fail, write unencrypted binary envelopes to public files to keep decryptors storage-agnostic

## Plan Segment From Master Blueprint
*   **Hardware Acceleration:** Client library uses frameworkless vanilla JS and the native browser window.crypto.subtle layer. Cryptographic math runs via compiled browser C++ code rather than raw JavaScript strings, preventing older mobile chips from bottlenecking.
*   **Static Asset Retrieval:** Pulls envelope encrypted data structures directly from public R2 over standard HTTP URLs, utilizing browser caching networks natively.

## Today's Objective
Design the client-side streaming decryption engine inside @schloss/gate/src/decrypt.ts. The script must pull the cryptographic specifications defined in @schloss/core/src/ciphers.ts, ingest raw encrypted response buffers over standard HTTP fetch, parse byte offsets to isolate the file metadata header, crack the sealed file DEK using local in-memory keys, and stream the resulting plaintext data chunks smoothly into the DOM.

Please outline the browser crypto execution sequences, stream parsing rules, memory footprint boundaries, and fallback render architectures. Do not write any code yet.

