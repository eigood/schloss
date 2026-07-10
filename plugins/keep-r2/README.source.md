# @schloss/keep-r2

Cloudflare R2 Storage Adapter Plugin for Schloss.

This is an optional plugin that extends the core Schloss ecosystem, allowing you to instantly deploy and manage your encrypted static shards on Cloudflare R2 object storage.

## Technical Specification

This plugin maps the foundational Keep specifications to the Cloudflare R2 API boundary layer. For the exact details on how S3-compatible commands translate across the network, refer to the [Schloss Architecture Plan](../../ARCHITECTURE.md).

## Architectural Purpose

This plugin acts as a concrete implementation of the abstract storage contracts defined in Core. By targeting Cloudflare R2, it enables a highly optimized, cost-efficient deployment profile:

*   **Zero Egress Fees:** Eliminates bandwidth costs when regular user browsers use `@schloss/gate` to download heavy encrypted files.
*   **S3-Compatible Integration:** Maps the base file path schemas directly to R2 bucket interactions using standard protocol standards.
*   **Isolated Overhead:** Packages heavy, vendor-specific network clients independently so developers who don't use Cloudflare never have to download the related software dependencies.

## Installation & Usage

This plugin is published as a standalone package. To use it in your project, install it alongside the main core library:

```bash
npm install @schloss/keep-r2
```

## Dependencies

*   **Internal:** Implements types and contracts from `@schloss/core`.
*   **Third-Party:** Safely isolates and contains the standard client libraries required to communicate natively with S3-compatible cloud storage APIs.

