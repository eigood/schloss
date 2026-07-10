===============================================================================
🏛️ ARCHITECTURAL SYSTEM BLUEPRINT: ISOMORPHIC SECURE STATIC ASSET NETWORK
===============================================================================

This plan outlines a high-performance Data Access Layer (DAL) authored as a 
modern, framework-agnostic NPM/Node package (ESM distribution). The library 
provides backend cryptographic orchestration for serverless JavaScript edge 
runtimes and a native, lightweight client layer for browsers.

By leveraging serverless relational computing alongside static public delivery, 
the architecture scales to thousands of consumers while protecting account 
quotas, preventing data loss, and keeping runtime code performant on older 
mobile devices.

-------------------------------------------------------------------------------
🗂️ 1. INFRASTRUCTURE ARCHITECTURE & ENVIRONMENT BOUNDARIES
-------------------------------------------------------------------------------
The library executes symmetrically across web-standard environments, using 
Wrangler for local emulation and deploying directly as a Cloudflare Worker mesh.

A. Identity & Backend Operational Zone:
* Firebase Auth Blocking Function: Triggers automatically upon account creation 
  to intercept the signup process, securely log the initial registration claim, 
  and seed the user record in the database before token issuance.
* Edge Compute Runtimes: The library runs on the V8 engine, seamlessly 
  integrating with Astro 6 (Cloudflare Adapter) or Next.js (Edge Runtime) page 
  routes and serverless API endpoints.
* Cloudflare D1 Database: The transactional source of truth for metadata. It 
  tracks user GUIDs, group memberships, user public keys, and unencrypted Group 
  Master Keys.
* Private R2 Bucket: A secure, internet-isolated archive storing raw, 
  unencrypted foundational data sources. If a consumer loses their keys, 
  disposable public assets can be recompiled from this database cache.

B. Public Distribution Zone (Static Asset Delivery):
* Public R2 Bucket: A read-only static web server exposed via a custom domain. 
  Browsers fetch assets directly via standard public URLs.
* Permanent User Profile Folder (/keys/users/{GUID}.json): Created once during 
  first-visit initialization. Contains the user's publicKey and their 
  passphrase-encrypted privateKey (Escrow). It is never modified during group 
  operations.
* Stripe Folder (/keys/slices/slice_X.json): Segmented data buckets that group 
  user allocations onto a Consistent Hashing Ring.
* Protected Files Folder (/protected-files/): Contains the encrypted data 
  payloads. Files are either named deterministically by user GUID (the user's 
  unique view of generated data) or by content-hash fingerprints.

-------------------------------------------------------------------------------
🗺️ 2. THE CRYPTOGRAPHIC DISTRIBUTION MODEL
-------------------------------------------------------------------------------
To enforce zero-knowledge access on a static server without server-side compute 
checks, the system implements Envelope Encryption combined with an inverted, 
sliced architecture.

* Individual File Protection: The backend generates a unique, single-use 
  Symmetric DEK (Data-Encrypting Key) to encrypt the asset. The DEK is 
  encrypted with the consumer's Asymmetric Public Key and appended directly 
  to the top of the file payload as a metadata header.
* Group File Protection: The asset is encrypted with a unique symmetric file 
  DEK. The file DEK is sealed using the active Group Master Key and attached 
  as a file header. The asset is stored in a version-controlled path 
  (/protected-files/groups/{Group_ID}_v{Version}/).
* Group Key Distribution: Active Group Master Keys are duplicated and encrypted 
  separately for each authorized member using their individual Public Keys. 
  These encrypted variations are stored inside the collective Hash Ring Stripe 
  Files rather than inside individual user profile files.

-------------------------------------------------------------------------------
⏱️ 3. USER LIFECYCLE WORKFLOWS
-------------------------------------------------------------------------------
A. Initial Entry & Cryptographic Onboarding:
1. A new user is created in the D1 relational database via an external 
   Firebase Identity Hook. At this stage, they are authenticated but lack 
   cryptographic keys.
2. Upon first site access, the frontend vanilla JavaScript client attempts to 
   fetch their identity file from public R2 and receives an expected HTTP 404.
3. This 404 serves as a deterministic trigger for the browser to run local 
   client-side key generation (slated for lightweight ECC/Elliptic Curve 
   Cryptography). 
4. The browser encrypts the generated private key using a user passphrase and 
   transmits the public/encrypted-private package to an Astro/Next.js server 
   endpoint.
5. The backend writes the permanent identity file to R2, calculates the user's 
   target coordinate on the Hash Ring, and registers an empty container block 
   for them inside that specific slice file.

B. Group Addition:
1. The administrative layer logs the group linkage into the D1 relational 
   database table.
2. The backend reads the target user's public key and the group's current 
   master key from D1.
3. The backend encrypts the group key with the user's public key and appends 
   the result into the user's pre-allocated block inside their designated 
   Hash Ring stripe file on R2 (1 server write).

C. User Removal / Group Key Rotation:
1. The administrative layer deletes the membership record from the D1 database.
2. The backend generates a brand-new group master key and increments the 
   group's active version integer in D1 and the global config.json static 
   manifest.
3. The backend queries D1 for all remaining authorized members of that group 
   and buckets them by their respective Hash Ring stripes.
4. The backend concurrently rewrites only the active stripe files to distribute 
   the new key version. The removed user is left out of the loops, terminating 
   their future access (Strictly bounded server writes).

-------------------------------------------------------------------------------
💾 4. FILE INGESTION & PROTECTION PATHS
-------------------------------------------------------------------------------
When an asset is uploaded or generated by the system, the administration layer 
checks an explicit classification parameter to determine encryption and 
directory paths:

* Public Routing: The library bypasses the cryptographic engine completely. It 
  routes the payload directly to a public directory on the storage provider, 
  attaching whatever native caching options your application requests.
* Individual Routing: The library generates a unique, single-use Symmetric DEK 
  to lock the file bytes. It looks up the target user's public identity from 
  D1, seals the DEK with that public key, attaches the sealed key payload 
  directly to the asset as a metadata header, and writes the secure file to 
  storage under a path mapped to their GUID.
* Group Routing: The library generates a unique file DEK and fetches the 
  group's current master key from D1. It seals the file DEK using the group 
  key, attaches the sealed key header to the encrypted asset bytes, and 
  writes the file into a version-controlled directory path 
  (/protected-files/groups/{Group_ID}_v{Version}/).

-------------------------------------------------------------------------------
🏎️ 5. MOBILE & CACHE OPTIMIZATION PLAN
-------------------------------------------------------------------------------
The library acts as a transparent data-access wrapper built entirely on 
web-standard primitives (Request, Response, and streams), offloading performance 
execution directly to the browser network thread and the Cloudflare edge CDN.

A. Write-Quota Preservation (Backend):
The BaseStorageProvider class inside the ESM library features an unopinionated 
pass-through contract. When the administrative layer puts a file into R2, it 
passes native platform options arrays directly to the Cloudflare environment. 
This allows the backend to natively inject strong ETags, content-hashes, and 
explicit httpMetadata properties during file creation, safely managing your 1 
Million writes/month account limit.

B. Network & CPU Efficiency (Older Mobile Devices):
* Hardware Acceleration: The client library uses frameworkless vanilla 
  JavaScript and the native browser window.crypto.subtle layer. Cryptographic 
  math runs via compiled browser C++ code rather than raw JavaScript strings, 
  preventing older mobile chips from bottlenecking.
* Zero-Round-Trip Repeats: For immutable content-hashed views, the backend sets 
  Cache-Control: public, max-age=31536000, immutable into R2. Older mobile 
  devices store these heavy encrypted binaries in local disk memory, loading 
  them in 0ms on repeat visits.
* Sub-Millisecond Cache Validation: For mutable slice files and global 
  manifests, the browser utilizes native network caching. It presents its local 
  ETag via standard If-None-Match network headers. If no group membership 
  changes have occurred, Cloudflare directly returns an empty HTTP 304 Not 
  Modified package, skipping payload downloads and cryptographic parsing 
  entirely.
* Minimized Metadata Transfers: By using Consistent Hashing Slices (e.g., 10 to 
  30 files total), a user with access to all 10 groups never downloads massive, 
  multi-megabyte system-wide files. They download a single, highly compressed 
  JSON slice file (~70KB), extracting only the precise operational keys they 
  require.
===============================================================================

