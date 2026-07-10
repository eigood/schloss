===============================================================================
📋 TASK 3: THE CLOUDFLARE D1 RELATIONAL SCHEMA
===============================================================================
Context Framework: Isomorphic Secure Static Asset Network
Target Environment: Cloudflare D1 (SQL-based Serverless Relational Database)

[BACKGROUND CONSTRAINTS]
- Architecture Role: Functions as the single source of structural relationship truth. Static files never hold relational metadata.
- Processing Target: Astro 6 / Next.js serverless backends query this database to figure out key mapping routes instantly, preventing expensive static file scanning overhead.

[PLAN SEGMENT FROM MASTER BLUEPRINT]
* Cloudflare D1 Database: The transactional source of truth for metadata. It 
  tracks user GUIDs, group memberships, user public keys, and unencrypted Group 
  Master Keys.
* User Lifecycle Interactions: Serves relational actions throughout the engine's 
  lifespan, including Firebase identity hooks, logging group memberships, 
  tracking cryptographic active version integers, and querying remaining 
  authorized group members during revocations.

[TODAY'S OBJECTIVE]
Design the SQL table layout, key indexing, and indexing strategies for the Cloudflare D1 metadata core. The schema must cleanly organize records for Users (tracking GUID profiles and public key structures), Groups (tracking group IDs, active cryptographic version integers, and secure master key storage), and Memberships (tracking relational associations between user GUIDs and groups).

Please map out the table schemas, data type alignments, data-integrity foreign keys, and query performance profiles needed to support rapid admin lookups. Do not write any code yet.
===============================================================================

