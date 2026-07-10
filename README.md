# Schloss

Multi-tier file security and client-side encryption for static web hosting. 

Schloss allows you to turn cheap or free static cloud storage buckets into a secure, role-protected file repository without maintaining an active, public-facing backend application server.

## Architecture & Implementation Plan

The full technical specification, cryptographic workflows, and multi-stage implementation roadmap for this library are detailed in our master design document.

See the [Master Architecture Document](./ARCHITECTURE.md) for the complete blueprint.

## Ecosystem Overview

This workspace contains the foundational modules and optional plugins for the Schloss ecosystem. The project is split into highly optimized, target-specific packages:

### Core Modules (`/modules`)
*   **@schloss/core** — The shared data foundation. Houses global constants, encryption configurations, and abstract types used downstream.
*   **@schloss/kern** — The administrative backend module. Used by your private admin environment to manage keys, track escrow payloads, and cryptographically sign file manifests.
*   **@schloss/keep** — The basic storage utility. Dictates path parsing and structure configurations for your passive assets.
*   **@schloss/gate** — The lightweight client bundle. Runs inside the browser to handle JWT validation and perform in-memory WebCrypto decryption.

### Optional Plugins (`/plugins`)
*   **@schloss/keep-r2** — Cloudflare R2 storage adapter. Extends Schloss to easily ship assets to zero-egress Cloudflare buckets.

## Repository Features

*   **Pure TypeScript:** Fully typed across all modules from a single source of truth.
*   **Raw ESM Workflow:** Zero build steps or compilation pipelines. Files are imported raw and optimized directly by your existing application bundler.
*   **Zero-Friction Dev Setup:** Navigating with `m + Tab` into the `modules/` directory completely avoids tab-completion collisions with `package.json`.

## Local Development Installation

To install all dependencies and establish local workspace cross-linking for every module simultaneously, run a single command at the repository root:

```bash
npm install
```
## Why "Schloss"?

In German, the word **Schloss** uniquely carries a dual meaning: it translates to both **"lock"** and **"castle."** 

This perfect linguistic intersection reflects the split architecture of the ecosystem:
*   **The Lock (Frontend):** Represents the heavy, client-side cryptography. The frontend browser runtime functions as a precise mechanical lock, using local private keys and native WebCrypto APIs to secure and decipher data in absolute isolation.
*   **The Castle (Backend):** Represents the administrative seat of power. The backend system functions as a protected fortress where roles, user permissions, and master key escrow matrices are structured and managed.

By bridging the heavy security of a "lock" with the structured multi-tier governance of a "castle," the name **Schloss** perfectly embodies a library designed to distribute cryptographically sealed assets across cheap, infinite-scale static environments.

