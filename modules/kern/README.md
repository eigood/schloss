# @schloss/kern

The active administrative engine and key escrow manager for Schloss.

`@schloss/kern` provides the backend management utilities required to coordinate user access, format files, and maintain cryptographic control over your static repository. It is designed to run in private, low-traffic backend environments or local CLI tools.

## Technical Specification

This module implements the server-side file signing matrices and the master key recovery schemas. For the complete structural breakdown of backend responsibilities, refer to the [Root Architecture Plan](../../ARCHITECTURE.md).

## Architectural Purpose

While regular users fetch data passively from a static cloud provider, Kern acts as the authoritative compiler that configures the system behind the scenes.

*   **Key Escrow Management:** Responsibly generates and tracks public/private key pairs, locking away recovery bundles so admins can manage permissions without knowing user passwords.
*   **Permission Signing:** Encrypts content and builds the master permission matrix, signing it securely before it is pushed out to public hosting layers.
*   **Token Issuance:** Validates user identity during administrative checks and hands down short-lived, cryptographically signed JWT clearance tokens.

## Dependencies

*   **Internal:** Relies directly on `@schloss/core` for shared payload architectures.
*   **Target Environment:** Optimized strictly for Node.js backend runtimes; utilizes server-side cryptographic and file system APIs.

