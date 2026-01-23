# 🗺️ Project Architecture: Gardenrealm

This document serves as the "Long-Term Memory" for the project. It maps the technical landscape and establishes the rules for how data and logic interact.

## 1. Technical Stack
- **Engine:** PixiJS v8 (WebGPU/WebGL).
- **Language:** Strict TypeScript.
- **Build Tool:** Vite.
- **Architecture:** Hybrid ECS-DOD (Entity Component System - Data Oriented Design).

---

## 2. The Heartbeat (Tick Order)
The game loop runs inside `main.ts` via the Pixi ticker. The execution order is strict to prevent "one-frame lag" bugs:

1.  **Input:** `ToolManager` processes mouse/touch interactions.
2.  **Lifecycle:** `LifecycleSystem` handles hunger, spawning, and path cleanup.
3.  **Job Dispatch:** `JobDispatchSystem` matches open jobs to idle sprigs.
4.  **Job Execution:** `JobExecutionSystem` runs the state-logic for current tasks.
5.  **Steering:** `SteeringSystem` calculates forces (Seek, Avoid, Separate).
6.  **Physics:** `PhysicsSystem` integrates forces into velocity/position and handles friction.
7.  **Rendering:** `RenderSystem` and `UIManager` update the visual state.

---

## 3. Data Ownership (SSOT)
`WorldState.ts` is the **Single Source of Truth**. 
- Systems are stateless; they accept `WorldState` and `dt` (delta time) and transform the data.
- **Objects vs. Arrays:**
    - **Use Arrays (SoA):** For high-volume entities (Sprigs). We use `Float32Array` buffers in `EntityData` for performance and memory locality.
    - **Use Objects/Interfaces:** For low-volume or unique world elements (Structures, Jobs, Paths).

---

## 4. The "Gig Economy" Model
The game logic centers on a Contract-based Job System:
1.  **Posting:** A `Structure` (e.g., Nest) identifies a need and posts a `Job`.
2.  **Dispatching:** `JobDispatchSystem` finds the nearest eligible `Sprig` and assigns the `jobId`.
3.  **Execution:** `JobExecutionSystem` checks the job type and hands the sprig to a specific **Runner** (e.g., `HarvestRunner`).
4.  **Completion:** The Runner fulfills the contract (e.g., deposit food) and clears the `jobId`.

---

## 5. System Decomposition
To keep files under the **300 LOC limit**, we use a delegated structure:
- **Core Systems:** Orchestrate logic (e.g., `SteeringSystem`).
- **Behaviors/Runners:** Pure logic/math units (e.g., `SteeringBehaviors`, `HarvestRunner`).
- **Renderers:** Specialized Pixi drawers (e.g., `SprigRenderer`, `StructureRenderer`).

---

## 6. UI Tiering
1.  **World Layer (PixiJS):** Physical entities like Sprigs and Structures.
2.  **Overlay Layer (PixiJS Debug):** Scent trails, selection arrows, and progress bars.
3.  **Chrome Layer (DOM):** Managed by `UIManager`, styled via `src/ui/style.css`. Used for buttons and toggles.

---

## 7. The Documentation Stack
- **GEMINI.md:** Broad directives and "Breadcrumbs" for current session focus.
- **INTENT.md:** Short-term memory. Detailed specs for the current branch/feature.
- **ARCHITECTURE.md:** Long-term memory. This reference map and history.
- **SYSTEM_HEALTH.md:** Automated reports from `npm run janitor` to prevent code cruft.

---

## 8. Glossary
- **Sprig:** The primary actor/unit in the colony.
- **Scent Trail:** A manual waypoint path drawn by the player using the Command tool.
- **Brownout:** A low-energy state caused by lack of food; results in reduced speed and efficiency.
- **Known Structures:** A Nest's internal memory of resource locations, populated by scouting sprigs.

TODO: Generate a file hierarchy with labels summarizing the role of each file/folder