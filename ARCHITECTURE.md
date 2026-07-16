# Architectural System Blueprint: Schloss Secure Static Asset Network

This plan outlines the architecture for @schloss, a high-performance Data Access
Layer (DAL) authored as a modern, framework-agnostic NPM/Node package (ESM
distribution). The library provides backend cryptographic orchestration for
serverless JavaScript edge runtimes and a native, lightweight client layer for
browsers.

By leveraging serverless relational computing alongside static public delivery,
the architecture scales to thousands of consumers while protecting account
quotas, preventing data loss, and keeping runtime code performant on older
mobile devices.

---

## 1. Monorepo Workspace Layout & Infrastructure Boundaries

The software is organized as an isomorphic multi-package monorepo workspace
with strict separation of compile-time and runtime dependencies.

```text
schloss/
├── modules/                   # Core Foundational Packages (m + Tab)
│   ├── core/                  # Downstream data contracts (Agnostic)
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.ts       # Core exports entry point
│   │       ├── schemas.ts     # Manifest and JWT payload structures
│   │       └── ciphers.ts     # WebCrypto configuration parameters
│   │
│   ├── kern/                  # Admin Backend Component (Node.js / Edge)
│   │   ├── package.json       # Depends strictly on @schloss/core
│   │   └── src/
│   │       ├── index.ts       # Kern exports entry point
│   │       ├── escrow.ts      # Escrow generation and file mechanics
│   │       └── sign.ts        # Manifest state signature builders
│   │
│   ├── keep/                  # Reference Storage Utility Component
│   │   ├── package.json       # Depends strictly on @schloss/core
│   │   └── src/
│   │       ├── index.ts       # Keep exports entry point
│   │       └── paths.ts       # Path hashing and 3-tier isolation logic
│   │
│   └── gate/                  # Frontend Client Component (Browser Client)
│       ├── package.json       # Depends strictly on @schloss/core
│       └── src/
│           ├── index.ts       # Gate exports entry point
│           ├── auth.ts        # Browser runtime JWT token tracking
│           └── decrypt.ts     # Local in-memory WebCrypto decryption
│
├── plugins/                   # Optional Third-Party Vendor Integrations
│   └── keep-r2/               # Cloudflare R2 Storage Adapter (S3-compatible)
│       ├── package.json       # Holds isolated vendor dependencies
│       └── README.source.md   # Markdown source with local links
│
├── scripts/                   # Shared Lifecycle Automation
│   └── prepare-release.mjs    # Native ESM publisher and URL parser
│
├── .schloss.release.json      # Hidden global git provider URL config
├── .npmignore                 # Prevents the /plugins folder from leaking to npm
├── package.json               # Monorepo root manifest and wildcard export router
└── README.md                  # Primary developer onboarding landing page
```
---

## 2. Backend Operational Zone (Secure Sandbox)

* Firebase Auth Blocking Function: Triggers automatically upon account creation
  to intercept the signup process, securely log the initial registration claim,
  and seed the baseline user row in the database before token issuance.
* Edge Compute Runtimes: The library runs on the serverless V8 engine,
  integrating with Astro 6 (Cloudflare Adapter) or Next.js (Edge Runtime) page
  routes and serverless API endpoints via Wrangler emulation.
* Cloudflare D1 Database: The transactional source of truth for system state
  metadata. It tracks user GUIDs, group memberships, user public keys, and
  unencrypted Group Master Keys, eliminating static file-scanning overhead.
* Private R2 Bucket: A secure, internet-isolated archive storing raw,
  unencrypted foundational data sources. Because consumers only view generated
  data, public assets are disposable and can be recompiled from this source
  cache at any time, engineering out data loss.
* Storage Vendor Plugin (@schloss/keep-r2): Located in the `plugins/` directory,
  this S3-compatible carrier implements the abstract primitives of
  `@schloss/keep`. It maps the library's isomorphic request/response structures
  directly to physical production Cloudflare R2 buckets.
* Global Singleton Memory Cache: The backend controller implements a
  global-scope JavaScript variable to store an in-memory instance of the parsed
  ring topology. This layout bypasses full storage read operations on active
  worker execution threads.

---

## 3. Public Distribution Zone (Static Site Delivery)

* Public R2 Bucket: A read-only static web server exposed via a custom domain.
  Browsers fetch all metadata files and data assets directly via public URLs.
* Permanent User Profile Folder (/keys/users/{GUID}.json): Created once during
  first-visit onboarding. Contains the user's publicKey and their
  passphrase-encrypted privateKey (Escrow). It is never modified during group
  operations.
* Stripe Folder (/keys/slices/slice_X.json): Segmented data buckets that group
  user allocations onto a Consistent Hashing Ring.
* Global Topology Document (/keys/config.json): The cryptographic structural
  directory. Contains the token positions, virtual node layouts, and group key
  tracking matrices. It serves as the target manifest for synchronized cache
  evaluations.
* Protected Files Folder (/protected-files/): Contains the encrypted data
  payloads. Files are either named deterministically by user GUID (for unique,
  user-specific views) or by content-hash fingerprints.

---

## 4. The Cryptographic Distribution Model & Cold-Start Workflows

### A. Core Cryptographic Distribution
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

### B. Cold-Start Topology Bootstrapping
* Uninitialized State Detection: If an operational execution thread triggers a
  topology load and the storage driver returns an HTTP 404 on config.json,
  the initialization layer automatically runs an idempotent bootstrap routing
  module.
* Baseline Ring Seeding: The bootstrap routine generates a default, evenly
  balanced, empty ring topology array (e.g., pre-allocating 10 default
  positions). It generates blank JSON skeleton maps for these initial slices and
  uploads them along with the baseline master configuration file to public R2,
  establishing the global platform state before the very first user registers.

---

## 5. User Lifecycle Workflows

### A. Synchronized Configuration Reading
1. Whenever a serverless action is triggered, the engine executes a reading
   wrapper that presents its local in-memory version identifier to the backing
   store via conditional HTTP headers (`If-None-Match`).
2. If the store returns an HTTP 304 Not Modified, the engine immediately trusts
   its local memory cache (0ms lookup), shielding against cross-datacenter
   latency.
3. If an external worker instance has updated the file in the interim, the store
   returns an HTTP 200 payload, forcing the local worker to instantly refresh
   its memory singleton and match global reality.

### B. Initial Entry & Cryptographic Onboarding
1. A new user is created in the D1 relational database via an external Firebase
   Identity Hook. At this stage, they are authenticated but lack cryptographic
   keys.
2. Upon first site access, the frontend vanilla JavaScript client
   (@schloss/gate) attempts to fetch their identity file from public R2 and
   receives an expected HTTP 404.
3. This 404 serves as a deterministic trigger for the browser to run local
   client-side key generation (slated for lightweight ECC/Elliptic Curve
   Cryptography).
4. The browser encrypts the generated private key using a user passphrase and
   transmits the public/encrypted-private package to an Astro/Next.js server
   endpoint.
5. The backend component (@schloss/kern) reads the cached topology
   configuration, calculates the user's target coordinate on the Hash Ring,
   writes the permanent identity file to R2, and registers an empty container
   block for them inside that specific slice file.

### C. Group Addition
1. The administrative layer logs the group linkage into the D1 relational
   database table.
2. The backend reads the target user's public key and the group's current master
   key from D1.
3. The backend encrypts the group key with the user's public key and appends the
   result into the user's pre-allocated block inside their designated Hash Ring
   stripe file on R2 (1 server write).

### D. User Removal & Optimistic Key Rotation
1. The administrative layer deletes the membership record from the D1 database.
2. The backend generates a brand-new group master key and increments the
   group's active version integer in D1.
3. The backend triggers a strict Read-Modify-Write sequence against config.json,
   passing the current cache version tracking token.
4. If an external worker has altered the file concurrently, the store rejects
   the update. The current worker then catches the conflict exception, refreshes
   its local memory, and safely re-runs its routing execution logic.
5. Upon a successful write-through verification pass, the updated config is
   committed to R2, the global cache indicator is invalidated across the mesh,
   and the engine concurrently rewrites only the active stripe files to
   distribute new keys while cleanly excluding the revoked user.

---

## 6. File Ingestion & Protection Paths

When an asset is uploaded or uniquely generated by the backend system, the
administration layer evaluates an explicit classification parameter to
determine the target cryptographic pipeline and storage directory:

* Public Routing: The library completely bypasses the cryptographic engine. It
  routes the raw payload directly to a public directory on the storage
  provider, attaching whatever native caching options your application requests.
* Individual Routing: The library synthesizes a uniquely tailored user data
  view. It generates a unique, single-use Symmetric DEK to lock the file bytes.
  It looks up the target consumer's public key from the D1 database, seals the
  DEK with that public key, attaches the sealed key payload directly to the
  asset as a metadata header, and writes the secure file to storage under a path
  mapped to their GUID.
* Group Routing: The library generates a unique file DEK and fetches the
  group's current master key from D1. It seals the file DEK using the group
  key, attaches the sealed key header to the encrypted asset bytes, and
  writes the file into a version-controlled directory path
  (/protected-files/groups/{Group_ID}_v{Version}/).

---

## 7. Mobile & Cache Optimization Plan

### A. Write-Quota Preservation (Backend Storage Layer)
The BaseStorageProvider class abstract interface—authored inside
**`@schloss/keep`**—defines a completely unopinionated pass-through contract
using standard web primitives. When the vendor plugin **`@schloss/keep-r2`**
implements this contract for production, it accepts the unchecked options
parameter block and passes it completely unmodified down to the physical
Cloudflare R2 bucket. This structural pass-through allows the administrative
core (`@schloss/kern`) to natively inject precise `R2PutOptions` (such as
strong ETags, custom content-hashes, and targeted cache-control headers)
during file creation, safely keeping global infrastructure writes well under
your 1 Million writes/month account limit.

### B. Mesh Synchronization and Latency Shielding
By routing the master configuration file through a strict read-verify-validate
loop, the edge computing layer completely bypasses storage lookup bottlenecks:
* 0ms Local Lookups: Worker instances evaluate the active Hash Ring topology
  directly out of a global JavaScript memory singleton, completely avoiding R2
  network calls on standard user requests.
* Mesh Consistency: The engine uses lightweight HTTP validation headers
  (`If-None-Match`) to query the static file server. If a different worker data
  center has pushed an update to `config.json`, the local instance immediately
  drops its stale variable and syncs with global reality without stalling the
  client request thread.

### C. Network & CPU Efficiency (Older Mobile Devices)
* Hardware Acceleration: The frameworkless client library (`@schloss/gate`)
  relies strictly on the browser's native `window.crypto.subtle` layer. Because
  these cryptographic routines run via compiled browser C++ code rather than
  heavy JavaScript libraries, asymmetric key unwrapping and symmetric
  decryption execute at native hardware speeds without lagging older mobile
  CPUs.
* Zero-Round-Trip Repeats: For static generated data views or content-hashed
  files, the system applies an aggressive `Cache-Control: public,
  max-age=31536000, immutable` directive. Older mobile hardware stores these
  heavy encrypted binaries directly inside local disk cache, loading them
  instantly on subsequent visits without hitting your servers.
* Sub-Millisecond Edge Validations: For mutable files that cannot use
  content-hashing (like `config.json` or individual ring slices), the browser
  uses native HTTP validation. The vanilla JS frontend presents its cached ETag
  via standard conditional headers. If the user's groups have not been modified,
  Cloudflare instantly returns a blank `HTTP 304 Not Modified` payload,
  consuming negligible mobile data.
* Bounded Metadata Footprint: By using the Consistent Hashing Ring to slice
  1,500 profiles into 10 to 30 independent stripe files, a consumer never
  downloads a massive, system-wide user directory. The browser fetches a single,
  highly compressed JSON file capped under ~70KB, keeping memory allocations
  safe on low-powered devices.

---

