# Context Shifting Handbook: Cross-Session Dependency Management

This handbook defines the exact step-by-step procedure for passing verified architectural designs between isolated development sessions. Follow this protocol at the conclusion of every task to eliminate data loss, prevent context drift, and ensure perfect synchronization across the @schloss monorepo modules.

---

## Phase 1: The Session Wrap-Up (Extracting the Contract)

Right before closing out a completed task session, copy and send the following exact prompt into the chat window:

```text
We have finished planning out the architecture for this task. Please generate a compact, dense, code-free API Contract block summarizing our final structural decisions (such as exact SQL schemas, JSON structures, file paths, TypeScript interfaces, function signatures, and return values). Do not include raw implementation code. I need to save this block to pass into future dependent task planning sessions.
```

```text
Generate a single-paragraph plain text task summary using inline bullets for my task file. Focus only on file locations, schema fields, dependencies, and scripts. No code blocks, no headers, and no markdown tables—just a dense text block I can instantly copy-paste.
```

Action: Copy the AI's dense response and save it locally in a text file named CONTRACT_TASK_X.txt (where X is the number of the task you just completed).

---

## Phase 2: Initializing the Next Session (Feeding Dependencies)

When you open a brand-new session for a dependent task, copy the template below, inject your stored contracts, and paste the entire block into the fresh window as your very first message.

```text
We are executing a multi-session project within the @schloss monorepo workspace. I am providing the exact raw task segment, alongside the verified contract outputs of our completed dependent tasks to maintain perfect architectural sync and prevent structural drift across modules.

--- CONTEXT FROM COMPLETED TASKS ---

[PASTE THE COMPACT CONTRACT TEXT FROM YOUR STORED CONTRACT_TASK_X FILES HERE. IF A TASK HAS MULTIPLE DEPENDENCIES, STACK THEM TOGETHER LINE-BY-LINE]

--- START PLAN SEGMENT ---
[PASTE THE ENTIRE CONTENT OF THE TARGET TASK MARKDOWN FILE HERE, E.G., THE CONTENTS OF YOUR LOCAL TASK_3.md FILE]
--- END PLAN SEGMENT ---

Today's Objective: We are planning the target task specified in the blueprint segment above, based strictly on the plan constraints and the completed contract context provided.

Please outline the operational execution steps, boundary conditions, and structural requirements. Do not write any code yet.
```

---

## The Dependency Handshake Checklist

Refer to this roadmap to see exactly which completed contracts need to be stacked inside your prompt before you launch a dependent task:

### Task 2: The Isomorphic Core Storage Interface & Plugins
*   Stack: Contract 1 (D1 Relational Schema File)

### Task 3: The Hash Ring Schema & Path Routing Matrix
*   Stack: Contract 1 (D1 Relational Schema File)
*   Stack: Contract 2 (Storage Provider Interface)

### Task 4: Firebase Auth User-Created Blocking Function
*   Stack: Contract 1 (D1 Relational Schema File)

### Task 5: Client Boot & Onboarding State Engine
*   Stack: Contract 1 (D1 Relational Schema File)
*   Stack: Contract 2 (Storage Provider Interface)
*   Stack: Contract 3 (Hash Ring Schema/Routing Matrix)
*   Stack: Contract 4 (Firebase Blocking Hook)

### Task 6: Server Security Orchestration Kernel
*   Stack: Contract 1 (D1 Relational Schema File)
*   Stack: Contract 2 (Storage Provider Interface)
*   Stack: Contract 3 (Hash Ring Schema/Routing Matrix)
*   Stack: Contract 4 (Firebase Blocking Hook)
*   Stack: Contract 5 (Client Onboarding Engine)

### Task 7: Asset Ingestion & Envelope Seeding Pipeline
*   Stack: Contract 1 (D1 Relational Schema File)
*   Stack: Contract 2 (Storage Provider Interface)
*   Stack: Contract 6 (Server Orchestration Kernel)

### Task 8: Web Crypto Runtime Decryption Engine
*   Stack: Contract 2 (Storage Provider Interface)
*   Stack: Contract 3 (Hash Ring Schema/Routing Matrix)
*   Stack: Contract 5 (Client Onboarding Engine)
*   Stack: Contract 6 (Server Orchestration Kernel)
*   Stack: Contract 7 (Asset Ingestion Pipeline)

