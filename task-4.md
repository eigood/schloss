===============================================================================
📋 TASK 4: FIREBASE AUTH USER-CREATED BLOCKING FUNCTION
===============================================================================
Context Framework: @schloss (Isomorphic Secure Static Asset Network Monorepo)
Target Environment: Node.js Execution Context / External Firebase Cloud Blocker
Dependencies: Task 1 (D1 Relational Schema Core)

[BACKGROUND CONSTRAINTS]
- System Role: Hooks directly into the signup workflow prior to token issuance to guarantee database presence.
- Sync Driver: The backend uses this transaction to build the baseline user row so that downstream JWT claims align instantly.

[PLAN SEGMENT FROM MASTER BLUEPRINT]
* Firebase Auth Blocking Function: Triggers automatically upon account creation
  to intercept the signup process, securely log the initial registration claim,
  and seed the user record in the database before token issuance.
* Lifecycle Step A.1: A new user is created in the D1 relational database
  via an external Firebase Identity Hook. At this stage, they lack cryptographic keys.

[TODAY'S OBJECTIVE]
Design the onboarding webhook pipeline for the Firebase authentication blocking engine. Plan out how the cloud function intercepts user generation events, confirms safety parameters, establishes a transactional communication socket to write a baseline profile row matching their target GUID into the Cloudflare D1 table, injects custom claims into the issuing token payload, and handles connection fallbacks.

Please map out the cloud function operational sequences, token payload structures, input sanitization rules, and exception fail-safes. Do not write any code yet.
===============================================================================

