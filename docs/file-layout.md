schloss/
├── modules/                         # Core Foundational Packages (m + Tab)
│   ├── core/                        # Downstream data contracts (Agnostic)
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.ts             # Core exports entry point
│   │       ├── schemas.ts           # Manifest and JWT payload structures
│   │       └── ciphers.ts           # WebCrypto configuration parameters
│   │
│   ├── kern/                        # Admin Backend Component (Node.js)
│   │   ├── package.json             # Depends strictly on @schloss/core
│   │   └── src/
│   │       ├── index.ts             # Kern exports entry point
│   │       ├── escrow.ts            # Escrow generation and file mechanics
│   │       └── sign.ts              # Manifest state signature builders
│   │
│   ├── keep/                        # Reference Storage Utility Component
│   │   ├── package.json             # Depends strictly on @schloss/core
│   │   └── src/
│   │       ├── index.ts             # Keep exports entry point
│   │       └── paths.ts             # Path hashing and 3-tier isolation logic
│   │
│   └── gate/                        # Frontend Client Component (Browser)
│       ├── package.json             # Depends strictly on @schloss/core
│       └── src/
│           ├── index.ts             # Gate exports entry point
│           ├── auth.ts              # Browser runtime JWT token tracking
│           └── decrypt.ts           # Local in-memory WebCrypto decryption
│
├── plugins/                         # Optional Third-Party Vendor Integrations
│   └── keep-r2/                     # Cloudflare R2 Storage Adapter (S3-compatible)
│       ├── package.json             # Holds isolated vendor dependencies
│       └── README.source.md         # Untouched markdown source with local links
│
├── scripts/                         # Shared Lifecycle Automation
│   └── prepare-release.mjs          # Native ESM publisher and URL parser
│
├── .schloss.release.json            # Hidden global git provider URL config
├── .npmignore                       # Prevents the /plugins folder from leaking to npm
├── package.json                     # Monorepo root manifest and wildcard export router
└── README.md                        # Primary developer onboarding landing page

