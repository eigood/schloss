===============================================================================
📋 TASK 2: THE ISOMORPHIC CORE STORAGE INTERFACE & PLUGINS
===============================================================================
Context Framework: @schloss (Isomorphic Secure Static Asset Network Monorepo)
Target Environment: @schloss/keep (Agnostic Contract) & @schloss/keep-r2 (Vendor)
Dependencies: Task 1 (D1 Relational Schema Core)

[BACKGROUND CONSTRAINTS]
- Workspace Mapping: Implemented inside modules/keep/ and plugins/keep-r2/.
- Interface Engine: Relies purely on web-standard Request, Response, Streams, and URL parameters.
- Quota Management: Must comfortably isolate and respect the 1 Million writes/month server account thresholds.

[PLAN SEGMENT FROM MASTER BLUEPRINT]
* Write-Quota Preservation (Backend): The BaseStorageProvider class features an
  unopinionated pass-through contract. When putting a file into R2, it passes
  native platform options arrays directly to the Cloudflare environment to natively
  inject strong ETags, content-hashes, and explicit httpMetadata properties.

[TODAY'S OBJECTIVE]
Design the abstract file-handling interface inside `@schloss/keep` and the production S3-compatible implementation inside `@schloss/keep-r2`. The abstract class must implement core file streaming wrappers (`readJson`, `writeJson`, `readBinary`, `writeBinary`) using native web primitives. The R2 plugin must pass raw platform option bundles (like Cloudflare's exact `R2PutOptions`) completely unmodified down to the underlying storage pool to write cache rules and custom ETags.

Please map out the abstract function signatures, pass-through options architecture, and stream handling workflows. Do not write any code yet.
===============================================================================

