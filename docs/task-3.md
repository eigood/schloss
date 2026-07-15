# Task 3: The Hash Ring Schema & Path Routing Matrix

* Context Framework: @schloss (Isomorphic Secure Static Asset Network Monorepo)
* Target Environment: @schloss/keep (src/paths.ts) & @schloss/core (src/schemas.ts)
* Dependencies: Task 1, Task 2

## Background Constraints
* Scale Boundary: Caps user bandwidth footprint under ~70KB per metadata check by segmenting 1,500 profiles into 10 to 30 slice files.
* Hashing Rules: Implements deterministic path resolution over a 3-tier isolation boundary.

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

## Plan Segment From Master Blueprint
* Stripe Folder (/keys/slices/slice_X.json): Segmented data buckets that group user allocations onto a Consistent Hashing Ring.
* Group Key Distribution: Active Group Master Keys are duplicated and encrypted separately for each authorized member using their individual Public Keys inside the shared Stripe Files.

## Today's Objective
Design the mathematical routing structure and JSON document architecture for the hash ring stripes. You must establish the schema matrix in @schloss/core for config.json and slice_X.json, integrating them alongside your database types. You must also define the routing algorithms inside @schloss/keep that resolve a user's GUID to a fixed slice coordinate on the ring using a sorted array of virtual nodes, alongside structuring the member key maps.

Please plan the ring modulo logic, token distribution math, JSON tree interfaces, and node bucket splitting processes. Do not write any code yet.

