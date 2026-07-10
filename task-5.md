# 📋 Task 5: Client Boot & Onboarding State Engine

*   **Context Framework:** @schloss (Isomorphic Secure Static Asset Network Monorepo)
*   **Target Environment:** @schloss/gate (src/auth.ts)
*   **Dependencies:** Task 1, Task 2, Task 3, Task 4

## 📌 Background Constraints
*   **Client Blueprint:** Framework-agnostic vanilla HTML5/JS designed for older mobile hardware.
*   **State Gate:** Manages the transitional unprovisioned state where a valid JWT claim exists, but no R2 files exist.

## 📌 Plan Segment From Master Blueprint
*   **User Lifecycle Onboarding (A.2-A.5):** Frontend vanilla JS client intercepts public R2 profile file fetch misses (HTTP 404). This acts as a trigger to execute local hardware key generation. The client captures a user passphrase, encrypts the private key to build an escrow bundle, and pushes it up to the Astro/Next.js endpoints to create /keys/users/{GUID}.json and register their slice allocation.

## 🎯 Today's Objective
Design the client boot-sequence interceptor and onboarding manager inside @schloss/gate/src/auth.ts. The script must seamlessly extract GUID custom claims from the web token, navigate 404 missing profiles gracefully, coordinate background asymmetric key generation using standard browser features, collect local passphrase input to derive encryption storage keys, and transmit registration data to the server.

Please outline the vanilla JS initialization sequence, network intercept states, local data validation, and transmission packet packaging. Do not write any code yet.

