# @schloss/core

The shared cryptographic and schema foundation for the Schloss ecosystem.

`@schloss/core` serves as the absolute downstream source of truth for structural contracts across all Schloss packages. It remains completely independent and does not import or rely on any sibling modules.

## Technical Specification

This module defines the foundational layout maps and mathematical properties required to link the admin tools and frontend applications together. For the exact data layouts and schema expectations, refer to the [Root Architecture Plan](../../ARCHITECTURE.md).

## Architectural Purpose

By centralizing the structural definition of data payloads, Core prevents contract drift between your administrative tools and browser clients. It manages four vital categories of un-coded types:

1.  **The Static Storage Manifest:** Defines the JSON structure of the map file stored on the passive server, ensuring Kern writes it correctly and Gate parses it flawlessly.
2.  **The Escrow Payload Contract:** Establishes the layout for encrypted private-key recovery bundles passed between the client and admin center.
3.  **The JWT Claim Matrix:** Dictates the layout of custom authorization claims (User IDs, Group IDs, expirations) embedded inside user tokens.
4.  **The Cryptographic Metadata Envelope:** Sets the wrapper structure for encrypted file blocks, ensuring consistent initialization vectors and hashing rounds.

## Distribution

This package is intended as an internal or shared dependency and is automatically consumed by `@schloss/kern`, `@schloss/keep`, and `@schloss/gate`.

