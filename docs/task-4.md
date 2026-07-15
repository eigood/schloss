# Task 4: Firebase Auth User-Created Blocking Function

*   **Context Framework:** @schloss (Isomorphic Secure Static Asset Network Monorepo)
*   **Target Environment:** Node.js Execution Context / External Firebase Cloud Blocker
*   **Dependencies:** Task 1 (D1 Relational Schema Core)

## Background Constraints
*   **System Role:** Hooks directly into the signup workflow prior to token issuance to guarantee database presence.
*   **Sync Driver:** The backend uses this transaction to build the baseline user row so that downstream JWT claims align instantly.

## CONTEXT FROM COMPLETED TASKS ---

# TASK SUMMARY: @schloss/core Persistence Layer Configuration

- FILE LOCATIONS: Schema in `src/schemas.ts`, config in `drizzle.config.ts`, snapshots/SQL in `drizzle/`.
- USERS TABLE: id (PK autoinc), firebase_guid (unique text), app_guid (unique text static asset key), public_key (text), created_at (int), optional email (text), optional display_name (text).
- GROUPS TABLE: id (PK autoinc), name (unique text), key_version (int, default 1), master_key (blob mapping to Uint8Array).
- MEMBERSHIPS TABLE: id (PK autoinc), user_id (FK users.id cascade), group_id (FK groups.id cascade), optional role (text). Composite unique rule on (user_id, group_id).
- SYSTEM SCRIPTS: Workspace execution from root via `npm -w @schloss/core`. Calls `drizzle-kit generate` for differentials, and `wrangler d1 migrations apply schloss-db` (with `--local` or `--remote`) for deployment.
- DEPS POLICY: `drizzle-orm` in dependencies for edge bundling; `drizzle-kit` in devDependencies.

## Plan Segment From Master Blueprint
*   **Firebase Auth Blocking Function:** Triggers automatically upon account creation to intercept the signup process, securely log the initial registration claim, and seed the user record in the database before token issuance.
*   **Lifecycle Step A.1:** A new user is created in the D1 relational database via an external Firebase Identity Hook. At this stage, they lack cryptographic keys.

## Today's Objective
Design the onboarding webhook pipeline for the Firebase authentication blocking engine. Plan out how the cloud function intercepts user generation events, confirms safety parameters, establishes a transactional communication socket to write a baseline profile row matching their target GUID into the Cloudflare D1 table, injects custom claims into the issuing token payload, and handles connection fallbacks.

Please map out the cloud function operational sequences, token payload structures, input sanitization rules, and exception fail-safes. Do not write any code yet.

