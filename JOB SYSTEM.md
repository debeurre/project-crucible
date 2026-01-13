# 🏗️ Architecture Proposal: The "Gig Economy" Job System

## 1. The Core Concept

To achieve a "Digital Terrarium" feel where Sprigs are autonomous but responsive to both user flags and environmental pressures, we are moving from a state-based model ("I am holding a rock, so I must go home") to a **Producer-Consumer (Gig Economy)** model.

* **The "Why":** Decouples **Means** (holding an item) from **Ends** (building a wall). It prevents logic traps where Sprigs get stuck because they don't know *why* they are holding an item.
* **The Metaphor:**
* **Producers:** The User (placing flags) and Nests (needing food) post "Help Wanted" tickets.
* **Consumers:** Idle Sprigs look for the closest, highest-paying ticket.



## 2. Implementation Details

### A. New Data Object: `JobData`

We will introduce a global `JobData` or similar Struct-of-Arrays (SoA) to track active contracts.

```typescript
// src/data/JobData.ts (Conceptual)
export const MAX_JOBS = 1000;

export enum JobType {
    IDLE = 0,
    HARVEST = 1,
    BUILD = 2,
    HAUL = 3,
    ATTACK = 4
}

export class JobData {
    // The "Ticket" info
    public active: Uint8Array;      // Is this job slot used?
    public type: Uint8Array;        // JobType
    public priority: Uint8Array;    // 1 (Low) to 10 (Critical)
    public targetId: Int32Array;    // The entity to interact with (Resource, Blueprint, Enemy)
    
    // The "Assignment" info
    public assignedSprigId: Int32Array; // Who is doing it? (-1 if open)
    
    // ... constructor initializing arrays ...
}

```

### B. New/Refactored Systems

1. **`JobDispatchSystem` (The Boss)**
* **Role:** Runs infrequently (e.g., every 10-30 frames). Matches Idle Sprigs to Open Jobs.
* **Logic:**
* scans `JobData` for `assignedSprigId === -1`.
* Finds the nearest capable `Sprig` with `jobId === -1`.
* Assigns the Job ID to the Sprig.


* **Replaces:** The "Job Assignment" logic currently inside `HiveMindSystem`.


2. **`JobExecutionSystem` (The Worker)**
* **Role:** Runs every frame. Executes the specific steps of the assigned job.
* **Logic:** Switch statement on `sprig.currentJobType`.
* *Case HARVEST:* Path to Target  Harvest  Path to Storage  Deposit  Complete Job.
* *Case BUILD:* Path to Stockpile  Pickup  Path to Site  Build  Complete Job.


* **Replaces:** `NavigationSystem` (Wandering becomes the "Default/Null" Job).



### C. Entity Data Updates

* **Sprig:** Needs a `currentJobId` (Int32) field.

## 3. The "Organic Growth" Loop (The 4X AI)

This architecture enables "Fungus-like" expansion without complex AI.

1. **Metabolic Loop (Survival):**
* **Nest:** Checks internal stock. If `Food < 50`, posts 10 `HARVEST` jobs.
* **Sprigs:** swarm out, gather food, return. The colony sustains itself.


2. **Expansion Loop (Growth):**
* **Nest:** Checks internal stock. If `Food > 500` (Abundance!), it detects empty space and posts a `BUILD_NEST` job at `(x+100, y+100)`.
* **Sprigs:** A Sprig accepts the job, grabs materials, and builds the new node.
* **Result:** The new node wakes up, starts posting its own `HARVEST` jobs, and the colony spreads naturally.



## 4. Integration with Flow Fields

The Job System and Flow Fields are complementary, not conflicting.

* **Job System:** Determines the **Destination**. ("Go to Nest A").
* **Flow Field:** Determines the **Route**. ("How do I get to Nest A efficiently?").

**Workflow:**

1. Sprig accepts `JOB_HAUL` (Target: Nest A).
2. `JobExecutionSystem` checks: "Do we have a Flow Field for Nest A?"
* **Yes:** Use `flowField.getVector(x, y)` to move. (Cheap, organic swarm movement).
* **No:** Use `Steering.seek(target)` (Fallback for unique targets).



## 5. Migration Roadmap

1. **Step 1:** Implement `JobData` structure.
2. **Step 2:** Refactor `HiveMindSystem` to *post* jobs instead of directly controlling Sprigs.
3. **Step 3:** Build `JobExecutionSystem` to handle basic `HARVEST` logic.
4. **Step 4:** Delete `NavigationSystem` and move "Wander" logic into `JobExecutionSystem` as the default state.

--- CLI CRITIQUE BELOW ---

### 🤖 Gem's Technical Review

The proposal is fundamentally sound and aligns well with the current `EntityData` SoA architecture. Moving from a reactive "Pull" model (HiveMind loop) to a managed "Push/Queue" model (JobData) is the correct step for scaling behavior complexity.

**1. Data & Memory Management**
*   **Approval:** `JobData` as a Struct-of-Arrays is excellent.
*   **Concern:** We need a robust allocation strategy for `JobData`. Since `MAX_JOBS` is fixed, we need a "Free List" or a fast way to find `active === 0` slots without iterating the whole array every time a Nest wants to post a job.
*   **Safety:** `targetId` in `JobData` refers to Structures. If a Structure is destroyed (e.g., Rock mined out), we must have a mechanism to immediately **invalidate** or **cancel** all jobs targeting it to prevent Sprigs from seeking ghosts.

**2. Dispatch Complexity**
*   **Critique:** The "Infrequent Dispatch" (10-30 frames) might cause visual latency where Sprigs stand idle despite work being available.
*   **Recommendation:** Use a "budgeted" dispatch per frame (e.g., "Assign up to 10 jobs per frame") rather than a full pause.
*   **Complexity:** The "Nearest Capable Sprig" search is `O(OpenJobs * IdleSprigs)`. Without a spatial index for *Sprigs* (which we have in `SpatialHash` now!), this will be slow. We should utilize the `SpatialHash` to find local candidates for jobs.

**3. Execution State Machine**
*   **Gap:** The proposal lists steps like "Path to Target -> Harvest -> Path to Storage". This implies `JobExecutionSystem` needs to track **Job Stage**.
*   **Suggestion:** Repurpose the existing `sprigs.state` (Uint8) to track the *Job Stage* (e.g., 0=Init, 1=MovingToSource, 2=Working, 3=MovingToSink), while `sprigs.currentJobId` links to the high-level task.

**4. Migration**
*   The transition from `NavigationSystem` (which I just patched to respect Idle state) to `JobExecutionSystem` is natural. `NavigationSystem` essentially becomes the "Job Executor for JobType.IDLE".

**Verdict:** **Proceed.** This architecture provides the necessary decoupling to implement "Expansion" and "Combat" without spaghetti logic.
