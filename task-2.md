===============================================================================
📋 TASK 2: THE ISOMORPHIC ESM STORAGE PROVIDER INTERFACE
===============================================================================
Context Framework: Isomorphic Secure Static Asset Network
Target Environment: Modern JavaScript ESM Library (Browser + Cloudflare V8 Worker)
Dependencies: Task 1 (Relational Schema)

[BACKGROUND CONSTRAINTS]
- Host Emulation: Local development runs via Wrangler; deployed as a production Worker.
- Data Types: Handles both structural JSON files (metadata metadata) and raw binary data payloads (protected files).
- Backend Limit: Must safeguard against and comfortably respect account limits (1 Million writes/month).

[PLAN SEGMENT FROM MASTER BLUEPRINT]
* Public R2 Bucket: A read-only static web server exposed via a custom domain. 
  Browsers fetch assets directly via standard public URLs.
* Write-Quota Preservation (Backend): The BaseStorageProvider class inside the 
  ESM library features an unopinionated pass-through contract. When the 
  administrative layer puts a file into R2, it passes native platform options 
  arrays directly to the Cloudflare environment. This allows the backend to 
  natively inject strong ETags, content-hashes, and explicit httpMetadata 
  properties during file creation, safely managing your 1 Million writes/month 
  account limit.

[TODAY'S OBJECTIVE]
Design the structural contract and architectural layers for a unified, fetch-based `BaseStorageProvider` class interface. This class must manage input/output tasks strictly using web-standard primitives (`Request` and `Response`). It must incorporate shared JSON/Binary serialization helpers in the base engine while allowing native platform option blocks (like Cloudflare's exact `R2PutOptions`) to pass straight down without any customization or mapping layer.

Please outline the abstract contract primitives, streaming mechanics, and architectural rules for this data storage wrapper. Do not write any code yet.
===============================================================================

