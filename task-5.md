===============================================================================
📋 TASK 5: ONBOARDING & FIRST-VISIT TRANSITION WORKFLOWS
===============================================================================
Context Framework: Isomorphic Secure Static Asset Network
Target Environment: Browser Runtime Client (Frameworkless Vanilla HTML5/JS)

[BACKGROUND CONSTRAINTS]
- Device Baseline: Optimized for performance and execution compatibility on older mobile devices.
- User State: Handles the "Cryptographically Unprovisioned" state where an authenticated user exists in the D1 table but possesses no keys or stripe entries.

[PLAN SEGMENT FROM MASTER BLUEPRINT]
* Permanent User Profile Folder (/keys/users/{GUID}.json): Created once during 
  first-visit initialization. Contains the user's publicKey and their 
  passphrase-encrypted privateKey (Escrow). It is never modified during group 
  operations.
* User Lifecycle Step A.2-A.5: Upon first site access, the frontend vanilla 
  JavaScript client attempts to fetch their identity file from public R2 and 
  receives an expected HTTP 404. This 404 serves as a deterministic trigger 
  for the browser to run local client-side key generation (slated for 
  lightweight ECC). The browser encrypts the generated private key using a user 
  passphrase and transmits the public/encrypted-private package to a backend 
  endpoint to write their profile and bind them to the Hash Ring.

[TODAY'S OBJECTIVE]
Map out the logic gating sequence, error interception parameters, and fallback state transitions for a user's very first visit to the site. The client-side library must cleanly intercept network missing file anomalies, execute local hardware key generation using standard browser features, securely collect passphrase input to derive local storage seals, and send onboarding updates back to the Astro/Next.js edge server without locking the main browser window.

Please outline the precise operational sequence, client state machines, error-catching thresholds, and edge-server update requirements. Do not write any code yet.
===============================================================================

