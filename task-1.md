# 📋 Task 1: The Cloudflare D1 Relational Schema

*   **Context Framework:** @schloss (Isomorphic Secure Static Asset Network Monorepo)
*   **Target Environment:** Cloudflare D1 (SQL-based Serverless Relational Database)
*   **Dependencies:** None (This forms the relational schema foundation)

## 📌 Background Constraints
*   **Monorepo Mapping:** Serves as the relational counterpart to the @schloss/core contracts.
*   **Processing Target:** Astro 6 / Next.js edge routers query this layer to look up keys and mappings instantly without file parsing loops.

## 📌 Plan Segment From Master Blueprint
*   **Cloudflare D1 Database:** The transactional source of truth for metadata. It tracks user GUIDs, group memberships, user public keys, and unencrypted Group Master Keys.
*   **User Lifecycle Workflows:** Provides transactional integrity for Firebase identity hooks, membership tracking, and active key version updates.

## 🎯 Today's Objective
Design the SQL table layout, column properties, and relational indexes for the Cloudflare D1 metadata schemas. The relational boundaries must safely organize:
1. Users Table: GUID identifier profiles, created timestamp, public key string allocations.
2. Groups Table: Group string identifiers, active key version counters, encrypted master hex keys.
3. Memberships Table: Relational intersection mapping GUIDs to authorized Group IDs.

Please outline the database schemas, primary/foreign key pairs, constraints, and index models needed to back backend routing scripts. Do not write any code yet.

