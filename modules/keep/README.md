# @schloss/keep

The static path orchestrator and reference storage utility for Schloss.

`@schloss/keep` defines the baseline layout conventions and path-resolution mechanics for managing file shards resting on a passive host. 

## Technical Specification

This module enforces the directory mapping patterns required to isolate and obscure files on a third-party server. For the geometric path logic and storage specifications, refer to the [Root Architecture Plan](../../ARCHITECTURE.md).

## Architectural Purpose

Because static cloud buckets cannot run processing code to enforce permissions, security must be achieved through path isolation and obscuration. Keep acts as the structural architect for these files:

*   **3-Tier Separation:** Outlines the physical boundary logic dividing assets into Public, Group, and Individual User zones.
*   **Deterministic Fetching:** Provides the path resolution rules that allow frontend tools to mathematically calculate exactly where an asset sits using deterministic cryptographic hashes rather than searching an active database.
*   **Reference Contract:** Serves as the base specification that optional third-party plugins (like Cloudflare R2) extend to match the core Schloss storage requirements.

## Dependencies

*   **Internal:** Relies directly on `@schloss/core` for layout structures.
*   **Target Environment:** Agnostic utility code designed to work across both local build environments and remote distribution pipelines.

