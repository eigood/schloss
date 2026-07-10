===============================================================================
📋 TASK 7: ADMIN CORE ORCHESTRATION ENGINE
===============================================================================
Context Framework: Isomorphic Secure Static Asset Network
Target Environment: Serverless Edge Controller Module (Astro 6 / Next.js V8 Worker)

[BACKGROUND CONSTRAINTS]
- Scale Boundary: Must ensure multi-user group mutations and key rotations stay safely bounded inside your 1M writes/month host limit.
- Operational Role: Acts as the transactional "glue" linking relational database modifications with static R2 file rewriting operations.

[PLAN SEGMENT FROM MASTER BLUEPRINT]
* User Lifecycle Section 3 (Workflows A, B, and C): Governs the core execution loops 
  for adding a user's initial cryptographic identity container to a ring slice, 
  handling group addition by patching single slice file locations (1 write), 
  and executing user group removals. Removal triggers master key regeneration, 
  incrementing global configuration tracking metrics, and concurrently 
  rewriting *only* the specific active stripe files to distribute new keys while 
  cleanly excluding the revoked user.

[TODAY'S OBJECTIVE]
Design the server-side business logic engine that orchestrates user additions, group provisioning, group attachments, and user group removals. The design must ensure that database updates and static storage writes execute with complete structural synchronization. It must also ensure that group key rotations scale horizontally by updating only the necessary stripe files concurrently.

Please outline the procedural execution flow, batch processing plans for database updates, parallelization strategies for R2 writes, and data fallback safety loops. Do not write any code yet.
===============================================================================

