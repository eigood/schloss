===============================================================================
📋 TASK 8: WEB CRYPTO RUNTIME DECRYPTION ENGINE (THE FINAL OUTPUT)
===============================================================================
Context Framework: @schloss (Isomorphic Secure Static Asset Network Monorepo)
Target Environment: @schloss/gate (src/decrypt.ts) & @schloss/core (src/ciphers.ts)
Dependencies: Task 2, Task 3, Task 5, Task 6, Task 7

[BACKGROUND CONSTRAINTS]
- Optimization Target: Tailored to prevent thread blockages or memory leaks on low-powered, legacy mobile browsers.
- Processing Foundation: Leverages native browser C++ compiled implementations via `window.crypto.subtle`.

[PLAN SEGMENT FROM MASTER BLUEPRINT]
* Hardware Acceleration: Client library uses frameworkless vanilla JS and the native browser window.crypto.subtle layer. Cryptographic math runs via compiled browser C++ code rather than raw JavaScript strings, preventing older mobile chips from bottlenecking.
* Static Asset Retrieval: Pulls envelope encrypted data structures directly from public R2 over standard HTTP URLs, utilizing browser caching networks natively.

[TODAY'S OBJECTIVE]
Design the client-side streaming decryption engine inside `@schloss/gate/decrypt.ts`. The script must pull the cryptographic specifications defined in `@schloss/core/ciphers.ts`, ingest raw encrypted response buffers over standard HTTP fetch, parse byte offsets to isolate the file metadata header, crack the sealed file DEK using local in-memory keys, and stream the resulting plaintext data chunks smoothly into the DOM.

Please outline the browser crypto execution sequences, stream parsing rules, memory footprint boundaries, and fallback render architectures. Do not write any code yet.
===============================================================================

