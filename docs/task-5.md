# Task 5: Client Boot & Onboarding State Engine

*   **Context Framework:** @schloss (Isomorphic Secure Static Asset Network Monorepo)
*   **Target Environment:** @schloss/gate (src/auth.ts)
*   **Dependencies:** Task 1, Task 2, Task 3, Task 4

## Background Constraints
*   **Client Blueprint:** Framework-agnostic vanilla HTML5/JS designed for older mobile hardware.
*   **State Gate:** Manages the transitional unprovisioned state where a valid JWT claim exists, but no R2 files exist.

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

# TASK SUMMARY: @schloss/keep & @schloss/core Routing Schema & Path Routing Matrix

- FILE LOCATIONS: Config and slice schemas in `@schloss/core/src/schemas.ts`, path router engine in `@schloss/keep/src/paths.ts`
- HASH RING SCHEMA: HashRingConfig mapping algorithm (text), vnodeFactor (int), sliceCount (int), ringTokens (int array), ringSliceIndices (int array), and a slices dictionary tracking sliceId, fileName, assetCount, and hashEtag
- USER PROFILE & KEY STRUCTURES: SliceStripePayload storing sliceId, generatedAt, profiles index mapping appGuid to UserProfilePayload (containing appGuid, firebaseGuid, publicKey, createdAt, metadata), and groupKeyDistribution index mapping groupId to keyVersion and members list (containing userId, keyVersion, ephemeralPublicKey, encryptedMasterKey, authenticationTag)
- SYSTEM LOGIC/SIGNATURES: murmurHash3(key: string) -> number, HashRingRouter class with constructor(options: HashRingRouterOptions) initializing storagePrefix, maxSliceByteSize, vnodeFactor, and maxProfilesPerSlice, getConfigFileKey() -> string, resolveSliceFileName(appGuid, config) -> string | null, resolveSliceFileKey(appGuid, config) -> string | null
- CODE/DEPS POLICY: Absolute zero trailing semicolons across files, unfolded continuous lines for signatures and simple logic, strictly empty lines with zero whitespace between function definitions, missing or invalid lookup resolutions consistently return null instead of throwing exceptions, externalized configuration boundaries for scale tuning, and dynamic storage prefix resolution

# TASK SUMMARY: @schloss/kern & apps/firebase-functions Authentication Hook Pipeline

- FILE LOCATIONS: Root Firebase configurations at `firebase.json` and `.firebaserc`, core library logic at `modules/schloss/packages/kern/src/auth/blockingHandler.ts`, public exports at `modules/schloss/packages/kern/src/index.ts`, Firebase function wrappers at `modules/schloss/apps/firebase-functions/src/index.ts`
- USERS TABLE/SCHEMA: SQLite schema columns matching `firebase_guid` (unique indexed text), `app_guid` (unique indexed 22-character URL-safe Base64 string), `created_at` (integer epoch timestamp), optional `email` (lowercase text), and optional `display_name` (sanitized text)
- SUPPORTING DATA STRUCTURES: `UserInput` interface mapping uid/email/displayName, `BlockingHandlerConfig` interface containing Cloudflare credentials (accountId, d1DbId, apiToken), `BlockingHandlerResult` mapping flat customClaims containing `app_guid` (string) and `k_status` ('pending' or 'active' state flags)
- SYSTEM LOGIC/SIGNATURES: `handleBeforeUserCreated(user: UserInput, config: BlockingHandlerConfig): Promise<BlockingHandlerResult>` executing raw parameterized inserts directly over Cloudflare REST API; `handleBeforeUserSignedIn(user: UserInput, existingClaims: Record<string, any> | undefined, config: BlockingHandlerConfig): Promise<BlockingHandlerResult>` verifying active token properties; `beforecreated` and `beforesignedin` Firebase Gen 2 identity blocking event wrappers
- CODE/DEPS POLICY: Absolute zero runtime dependencies on `drizzle-orm` or `@schloss/core` within the deployment context to mitigate cold-start latency; no trailing semicolons; single quotes for string literals (backticks permitted for dynamic evaluations); local library dependencies packaged for deployment using the `npm pack` tarball staging strategy; standard Node.js native `crypto.randomBytes(16)` for high-entropy CSPRNG ID generation; comprehensive try/catch blocks in wrapper triggers to gracefully abort client auth registrations with an `HttpsError` on database failure

## Plan Segment From Master Blueprint
*   **User Lifecycle Onboarding (A.2-A.5):** Frontend vanilla JS client intercepts public R2 profile file fetch misses (HTTP 404). This acts as a trigger to execute local hardware key generation. The client captures a user passphrase, encrypts the private key to build an escrow bundle, and pushes it up to the Astro/Next.js endpoints to create /keys/users/{GUID}.json and register their slice allocation.

## Today's Objective
Design the client boot-sequence interceptor and onboarding manager inside @schloss/gate/src/auth.ts. The script must seamlessly extract GUID custom claims from the web token, navigate 404 missing profiles gracefully, coordinate background asymmetric key generation using standard browser features, collect local passphrase input to derive encryption storage keys, and transmit registration data to the server.

Please outline the vanilla JS initialization sequence, network intercept states, local data validation, and transmission packet packaging. Do not write any code yet.

