# 📋 Task 7: Asset Ingestion & Envelope Seeding Pipeline

*   **Context Framework:** @schloss (Isomorphic Secure Static Asset Network Monorepo)
*   **Target Environment:** @schloss/kern (File Ingestion Layer) & @schloss/keep
*   **Dependencies:** Task 1, Task 2, Task 6

## 📌 Background Constraints
*   **Sovereignty:** The user acts strictly as a consumer; generated protected files are tailored, custom data outputs.
*   **Redundancy Engine:** The private R2 bucket functions as an absolute master cache, permitting total public file recovery.

## 📌 Plan Segment From Master Blueprint
*   **Private R2 Bucket:** Secure, internet-isolated archive storing raw, unencrypted foundational data sources to permit recovery.
*   **Ingestion Paths (Section 6):** Directs payloads by classification type: Public Routing sends data raw to public directories. Individual Routing wraps data in a unique file DEK sealed via a user public key. Group Routing seals file DEKs via the current Group Master Key inside version-controlled folders.

## 🎯 Today's Objective
Design the asset onboarding and encryption streaming pipeline inside @schloss/kern. The engine must receive data streams, save the unencrypted source assets securely to the internet-isolated private R2 bucket, evaluate security routing types, fetch the necessary keys from D1, wrap files in unique symmetric DEKs, build the metadata header wrapper packets, and commit the public asset to R2 with native cache instructions.

Please outline the data streaming architecture, envelope crypto operations, path generation parameters, and metadata pass-through mapping. Do not write any code yet.

