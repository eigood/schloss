===============================================================================
📋 TASK 6: SERVER SECURITY ORCHESTRATION KERNEL
===============================================================================
Context Framework: @schloss (Isomorphic Secure Static Asset Network Monorepo)
Target Environment: @schloss/kern (src/escrow.ts & src/sign.ts)
Dependencies: Task 1, Task 2, Task 3, Task 4, Task 5

[BACKGROUND CONSTRAINTS]
- Engine Sandbox: Astro 6 / Next.js edge application worker endpoints running on Cloudflare.
- Security Constraint: Backend must remain fully "blind" to the user's unencrypted private profile credentials.

[PLAN SEGMENT FROM MASTER BLUEPRINT]
* Lifecycle Operations Engine (Section 3): Admin backend processes the client onboarding
  escrow payload to commit key files and update hash ring slices. Handles group addition
  by updating a single user slot (1 write). Orchestrates group removal by deleting database
  associations, regenerating group master keys, incrementing configuration version integers,
  and batch-writing updated keys concurrently to only the active slice structures.

[TODAY'S OBJECTIVE]
Design the master administrative backend controller loop logic inside `@schloss/kern`. The system must coordinate transactional database modifications inside Cloudflare D1 with public static asset deployments to R2. It must enforce zero-knowledge escrow compilation, handle single-user group additions, and execute group key rotations that scale by rewriting only the necessary hash ring slice chunks concurrently.

Please outline the server transaction sequences, D1 batch architectures, parallel slice-writing mechanics, and atomic recovery scripts. Do not write any code yet.
===============================================================================

