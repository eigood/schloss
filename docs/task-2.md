# Task 2: The Isomorphic Core Storage Interface & Plugins

* Context Framework: @schloss (Isomorphic Secure Static Asset Network Monorepo)
* Target Environment: @schloss/keep (Agnostic Contract) & @schloss/keep-r2 (Vendor Plugin)
* Dependencies: Task 1 (Programmatic Schema Core)

## Background Constraints
* Workspace Mapping: Implemented inside modules/keep/ and plugins/keep-r2/.
* Interface Engine: Relies purely on web-standard Request, Response, Streams, and URL parameters.
* Quota Management: Must comfortably isolate and respect the 1 Million writes/month server account thresholds.

## CONTEXT FROM COMPLETED TASKS ---

# TASK SUMMARY: @schloss/core Task 1 Programmatic Schema Core

- FILE LOCATIONS: Schema in `src/schemas.ts`, config in `drizzle.config.ts`, snapshots/SQL in `drizzle/`.
- USERS TABLE: id (PK autoinc), firebase_guid (unique text), app_guid (unique text static asset key), public_key (text), created_at (int), optional email (text), optional display_name (text).
- GROUPS TABLE: id (PK autoinc), name (unique text), key_version (int, default 1), master_key (blob mapping to Uint8Array).
- MEMBERSHIPS TABLE: id (PK autoinc), user_id (FK users.id cascade), group_id (FK groups.id cascade), optional role (text). Composite unique rule on (user_id, group_id).
- SYSTEM SCRIPTS: Workspace execution from root via `npm -w @schloss/core`. Calls `drizzle-kit generate` for differentials, and `wrangler d1 migrations apply schloss-db` (with `--local` or `--remote`) for deployment.
- DEPS POLICY: `drizzle-orm` in dependencies for edge bundling; `drizzle-kit` in devDependencies.

## Plan Segment From Master Blueprint
* Write-Quota Preservation (Backend): The BaseStorageProvider class features an unopinionated pass-through contract. When putting a file into R2, it passes native platform options arrays directly to the Cloudflare environment to natively inject strong ETags, content-hashes, and explicit httpMetadata properties.

## Today's Objective
Design the abstract file-handling interface inside @schloss/keep and the production S3-compatible implementation inside @schloss/keep-r2. The abstract class must implement core file streaming wrappers (readJson, writeJson, readBinary, writeBinary) using native web primitives. The R2 plugin must pass raw platform option bundles (like Cloudflare's exact R2PutOptions) completely unmodified down to the underlying storage pool to write cache rules and custom ETags.

Please map out the abstract function signatures, pass-through options architecture, and stream handling workflows. Do not write any code yet.

