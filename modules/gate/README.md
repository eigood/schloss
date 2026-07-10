# @schloss/gate

The lightweight frontend client fetcher and browser decryption runtime.

`@schloss/gate` is the client-side package that runs entirely within the regular user's web browser. It is optimized to be incredibly lightweight, ensuring it adds minimal overhead to your user application bundle.

## Technical Specification

This module governs client-side extraction, memory management, and browser cryptography. For the sequence diagrams mapping network data requests to decryption workflows, refer to the [Root Architecture Plan](../../ARCHITECTURE.md).

## Architectural Purpose

Gate manages the final leg of the decentralized file loop, handling all verification and decoding entirely in local browser memory.

*   **Token Authentication:** Evaluates the user's current local JWT clearance claims to identify which groups or individual file paths they have authorization to request.
*   **Fragment Fetching:** Targets and downloads only the specific encrypted file shards needed from the static cloud host, completely bypassing the need to ping a traditional backend server.
*   **Client-Side Decryption:** Uses the user's private key to execute instant decryption safely within browser isolation via native WebCrypto browser APIs.

## Dependencies

*   **Internal:** Relies on `@schloss/core` to read incoming cryptographic wrappers and manifests.
*   **Target Environment:** Built strictly for browser environments; utilizes native modern browser WebCrypto and Fetch APIs.

