===============================================================================
📋 TASK 8: FILE INGESTION & PROTECTION PIPELINE
===============================================================================
Context Framework: Isomorphic Secure Static Asset Network
Target Environment: Backend File Engine (Astro 6 / Next.js Serverless Sandbox)

[BACKGROUND CONSTRAINTS]
- Data Direction: Users function exclusively as consumers; any uploaded material becomes system property. Individual files are uniquely generated custom data views.
- Durability Model: Real data truth lives in D1/Private R2; files in public R2 are disposable and easily reproducible.

[PLAN SEGMENT FROM MASTER BLUEPRINT]
* Private R2 Bucket: A secure, internet-isolated archive storing raw, 
  unencrypted foundational data sources. If a consumer loses their keys, 
  disposable public assets can be recompiled from this database cache.
* File Ingestion Paths (Section 4): Evaluates incoming data payloads against an 
  explicit classification type: Public Routing bypasses crypto for raw public 
  folder landing. Individual Routing locks data with a symmetric file DEK 
  sealed via the user's public key (mapped to their GUID path). Group Routing 
  seals the file DEK via the active Group Master key and targets a version-controlled 
  directory structure.

[TODAY'S OBJECTIVE]
Design the system's asset onboarding and encryption processing pipeline. Plan how the server engine receives file streams or synthesizes unique view summaries, splits the data flow based on security classifications, writes raw unencrypted states to the secure private R2 cache repository, runs the selected envelope encryption math, and pushes the final encrypted file out to the public static server with precise cache metadata parameters applied.

Please outline the streaming ingestion channels, envelope crypto procedures, versioned file-naming architectures, and direct storage parameter mapping. Do not write any code yet.
===============================================================================

