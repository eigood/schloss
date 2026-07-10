# Task 1: Repository-First Relational Schema Definition

* Context Framework: @schloss (Isomorphic Secure Static Asset Network Monorepo)
* Target Environment: @schloss/core (src/schemas.ts) via a TypeScript ORM
* Dependencies: None (This forms the programmatic foundation for all packages)

## Background Constraints
* Monorepo Architecture: The database schema must live as static TypeScript definitions inside the core package so all other modules can import types natively.
* Deployment Mapping: These code definitions will serve as the source of truth for generating local file migrations and pushing updates to production Cloudflare D1 instances.

## Plan Segment From Master Blueprint
* Cloudflare D1 Database: The transactional source of truth for metadata. It tracks user GUIDs, group memberships, user public keys, and unencrypted Group Master Keys, driven by code definitions.

## Today's Objective
Design the programmatic SQL table layouts and entity models inside `@schloss/core/src/schemas.ts`. You must model the exact schemas using a TypeScript ORM structure to safely organize:
1. Users Entity: GUID identifier strings, created timestamp integers, public key allocations.
2. Groups Entity: Group string identifiers, active key version counters, encrypted master hex keys.
3. Memberships Entity: Relational intersection table with foreign key constraints mapping user GUIDs to authorized Group IDs.

Please outline the exact TypeScript ORM schema definitions, field data types, index mappings, and exported types needed by downstream modules. Do not write any code yet.

