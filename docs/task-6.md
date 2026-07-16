# Task 6: Admin Core Orchestration Engine

*   **Context Framework:** @schloss (Isomorphic Secure Static Asset Network Monorepo)
*   **Target Environment:** @schloss/kern (src/escrow.ts & src/sign.ts)
*   **Dependencies:** Task 1, Task 2, Task 3, Task 4, Task 5

## Background Constraints
*   **Engine Sandbox:** Astro 6 / Next.js edge application worker endpoints running on Cloudflare.
*   **Security Constraint:** Backend must remain fully "blind" to the user's unencrypted private profile credentials.

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
- SYSTEM LOGIC/SIGNATURES: murmurHash3(key: string) -> number, bootstrapEmptyConfig(sliceCount, vnodeFactor) -> HashRingConfig, HashRingRouter class with constructor(options: HashRingRouterOptions) initializing storagePrefix, maxSliceByteSize, vnodeFactor, and maxProfilesPerSlice, getConfigFileKey() -> string, resolveSliceFileName(appGuid, config) -> string | null, resolveSliceFileKey(appGuid, config) -> string | null
- CODE/DEPS POLICY: Absolute zero trailing semicolons across files, unfolded continuous lines for signatures and simple logic, strictly empty lines with zero whitespace between function definitions, missing or invalid lookup resolutions consistently return null instead of throwing exceptions, cold-start initialization handling via empty ring bootstrapping, externalized configuration boundaries for scale tuning, and dynamic storage prefix resolution

# TASK SUMMARY: @schloss/kern & apps/firebase-functions Authentication Hook Pipeline

- FILE LOCATIONS: Root Firebase configurations at `firebase.json` and `.firebaserc`, core library logic at `modules/schloss/packages/kern/src/auth/blockingHandler.ts`, public exports at `modules/schloss/packages/kern/src/index.ts`, Firebase function wrappers at `modules/schloss/apps/firebase-functions/src/index.ts`
- USERS TABLE/SCHEMA: SQLite schema columns matching `firebase_guid` (unique indexed text), `app_guid` (unique indexed 22-character URL-safe Base64 string), `created_at` (integer epoch timestamp), optional `email` (lowercase text), and optional `display_name` (sanitized text)
- SUPPORTING DATA STRUCTURES: `UserInput` interface mapping uid/email/displayName, `BlockingHandlerConfig` interface containing Cloudflare credentials (accountId, d1DbId, apiToken), `BlockingHandlerResult` mapping flat customClaims containing `app_guid` (string) and `k_status` ('pending' or 'active' state flags)
- SYSTEM LOGIC/SIGNATURES: `handleBeforeUserCreated(user: UserInput, config: BlockingHandlerConfig): Promise<BlockingHandlerResult>` executing raw parameterized inserts directly over Cloudflare REST API; `handleBeforeUserSignedIn(user: UserInput, existingClaims: Record<string, any> | undefined, config: BlockingHandlerConfig): Promise<BlockingHandlerResult>` verifying active token properties; `beforecreated` and `beforesignedin` Firebase Gen 2 identity blocking event wrappers
- CODE/DEPS POLICY: Absolute zero runtime dependencies on `drizzle-orm` or `@schloss/core` within the deployment context to mitigate cold-start latency; no trailing semicolons; single quotes for string literals (backticks permitted for dynamic evaluations); local library dependencies packaged for deployment using the `npm pack` tarball staging strategy; standard Node.js native `crypto.randomBytes(16)` for high-entropy CSPRNG ID generation; comprehensive try/catch blocks in wrapper triggers to gracefully abort client auth registrations with an `HttpsError` on database failure

# TASK SUMMARY: Client Cryptographic Identity Gateway (@schloss/gate)

- FILE LOCATIONS: package.json (workspace package configuration), tsconfig.json (workspace compiler configuration), src/types.ts (shared cryptographic payload definitions), src/index.ts (unified public export gateway), src/auth.ts (client-side state and key derivation engine), src/middleware.ts (server-side Firebase token validation edge middleware), src/components/SchlossAuth.astro (pure custom element static layout), src/components/SchlossAuthElement.ts (dynamic DOM logic and state router)
- [MAIN OBJECT] TABLE/SCHEMA: SchlossAuthEngine Custom HTML Elements comprising the parent controller 'schloss-auth-engine' and the sub-screens 'schloss-screen-locked', 'schloss-screen-onboard', 'schloss-screen-unlock', 'schloss-screen-link', 'schloss-screen-pending', and 'schloss-screen-dashboard' all styled and toggled in the Light DOM using the 'active' attribute boolean flag
- [SUPPORTING DATA] STRUCTURES: AuthState (union of string constants 'unprovisioned', 'active', 'pending_approval', 'locked'), UserRegistrationPacket (structure holding keyBackup JsonWebKey and salt string), EscrowBundle (structure holding keyBackup JsonWebKey, salt string, and appGuid string), AuthenticatedContext (structure holding uid string, optional email string, and optional appGuid string), SchlossState (structure holding status AuthState and optional appGuid string)
- SYSTEM LOGIC/SIGNATURES: SchlossAuthEngine methods including boot (resolves token to state), onboard (derives keys and registers credentials), unlock (recovers keys from local salt cache), linkDevice (downloads and restores escrow keys), requestAdminGatedRekey (triggers rotation request), and clearSession (flushes active memory key material); Middleware functions including decodeJwt (inspects payload), verifyFirebaseJwt (verifies token via Google JWKs using Web Crypto), and guard (higher-order route protector returning standard HTTP Responses)
- CODE/DEPS POLICY: Strictly no trailing semicolons; all constant strings must use single quotes; blank lines required between functions; no folding of long statements; zero pre-compilation steps in the workspace package distributing raw TypeScript/Astro source files directly; the SchlossAuth Astro component must fail fast at compilation if apiBaseUrl or cdnBaseUrl are omitted; no static element IDs permitted in markup

## Plan Segment From Master Blueprint
*   **Lifecycle Operations Engine (Section 5):** Admin backend processes the client onboarding escrow payload to commit key files and update hash ring slices. Handles group addition by updating a single user slot (1 write). Orchestrates group removal by deleting database associations, regenerating group master keys, incrementing configuration version integers, and batch-writing updated keys concurrently to only the active slice structures.

## Today's Objective
Design the master administrative backend controller loop logic inside @schloss/kern. The system must coordinate transactional database modifications inside Cloudflare D1 with public static asset deployments to R2. It must enforce zero-knowledge escrow compilation, handle single-user group additions, and execute group key rotations that scale by rewriting only the necessary hash ring slice chunks concurrently.

Please outline the server transaction sequences, D1 batch architectures, parallel slice-writing mechanics, and atomic recovery scripts. Do not write any code yet.

