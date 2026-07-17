# Task 10: The Unified Registration Gateway & Hook Integration

* Context Framework* @schloss (Isomorphic Secure Static Asset Network Monorepo)
* Target Environment: `@schloss/kern` (implementing `src/registration.ts`) & `apps/firebase-functions` (refactoring the auth pipeline)
* Dependencies: Task 4, Task 9

## Background Constraints

* Interface Decoupling: The master blueprint introduces `RegistrationGateway` to decouple raw identity provider data from the core database logic, unifying production Firebase blocking functions with local development mock environments.
* Cold-Start Isolation: The deployment package inside `apps/firebase-functions` must retain its optimized profile to mitigate latency, but must route operations cleanly through the gateway pattern rather than issuing loose, raw parameterized REST requests.

## CONTEXT FROM COMPLETED TASKS ---

# TASK SUMMARY: @schloss/kern & apps/firebase-functions Authentication Hook Pipeline

* FILE LOCATIONS: Logic at `blockingHandler.ts`, public exports at `kern/src/index.ts`, wrappers at `apps/firebase-functions/src/index.ts`.
* USERS TABLE: Tracks `firebase_guid`, `app_guid`, `created_at`, `email`, and `display_name`.
* ORIGINAL HOOK SIGNATURES: `handleBeforeUserCreated(user: UserInput, config: BlockingHandlerConfig): Promise<BlockingHandlerResult>` and `handleBeforeUserSignedIn(user: UserInput, existingClaims: Record<string, any> | undefined, config: BlockingHandlerConfig)`.
* ORIGINAL DEPS POLICY: Absolute zero runtime dependencies on `drizzle-orm` or `@schloss/core` within the cloud function deployment bundle to avoid cold-start lag.

# TASK SUMMARY: Schloss Core & Kern Orchestration (Task 9)

* SYSTEM LOGIC/SIGNATURES: Coordinates transactional state via `ConfigCoordinator.getRouter()`, `ConfigCoordinator.getConfig()`, and `onboardUserEscrow(db, coordinator, input)`.
* CODE/DEPS POLICY: Generic Drizzle database types (`any`), avoiding direct local driver imports (`"./db"`), ensuring cross-worker synchronization.

## Today's Objective

Design the formal class definition and execution contract for `RegistrationGateway` inside `@schloss/kern/src/registration.ts` and refactor the Firebase cloud functions to utilize it.

You must bridge the gap between the isolated, high-performance auth pipeline (Task 4) and the robust orchestration patterns (Task 9) by doing the following:

1.Design the `RegistrationGateway` Abstract Contract:
* Define an abstract class or interface `BaseRegistrationGateway` that standardizes user registration, verification, and claims-mapping methods.
* Map out two concrete implementations:
* `D1RestRegistrationGateway`: A lightweight, zero-Drizzle implementation that uses native `fetch` over the Cloudflare D1 REST API to persist registration rows (matching Task 4's cold-start constraints).
* `DrizzleRegistrationGateway`: A standard implementation for serverless web applications that uses generic Drizzle instances to execute database persistence.

2. Define the Interface Signatures:
* Formulate how the gateway initializes with its environment credentials.
* Design the primary execution hook methods on the gateway (e.g., `registerPendingUser(uid, email, displayName)` and `verifyAndActivateUser(uid, appGuid)`).

3. Refactor the Firebase Auth Hooks (`apps/firebase-functions`):
* Update `handleBeforeUserCreated` and `handleBeforeUserSignedIn` to dynamically instantiate and route through the `D1RestRegistrationGateway`.
* Replace the raw, inline REST query blocks from Task 4 with clean, testable gateway method calls while keeping the runtime dependencies on `drizzle-orm` and `@schloss/core` at zero.

Please outline the precise operational flow of the refactored hooks, the interface definitions for the new gateways, and how configuration is passed into these adapters. Do not write any code yet.
