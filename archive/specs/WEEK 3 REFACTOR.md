# Week 3 Refactor Plan: Deep Clean & Architecture Hardening

## 1. Goal
The goal is to transition from a "rapid prototype" codebase to a stable, scalable "production foundation." We want to eliminate technical debt, standardize patterns, and make future features (like Building systems, Combat, AI) easier to implement without breaking existing tools.

## 2. Core Philosophy for Refactor
*   **Single Source of Truth:** Data should live in one place (System), visuals in another (View/Container), and tools should just manipulate data.
*   **Explicit over Implicit:** Remove "magic" behavior (like implicit state transitions or hidden side effects).
*   **Strict Typing:** Eliminate all `any` casts (implicit or explicit) and ensure strict null checks are respected properly without hacky `!` assertions where possible.
*   **Modularity:** `Game.ts` should be a thin orchestrator, not a logic dump.

## 3. Focus Areas

### A. The "God Class" Problem (`Game.ts`)
*   **Current State:** `Game.ts` initializes everything, handles the main loop, manages input state, and coordinates UI. It knows too much.
*   **Refactor:**
    *   Extract `WorldManager` or `SceneManager` to handle the `worldContainer` and system initialization.
    *   Move Input handling logic (hotkeys, tool switching) fully into `ToolManager` or a dedicated `InputController`.
    *   `Game.ts` should effectively just say: `new App()`, `new Scene()`, `scene.update()`.

### B. Tool System Tightness
*   **Current State:** Tools manually reach into Systems to draw cursors, modify state, and handle input. `OmniPencilTool` has duplicated logic for rendering that overlaps with `MovementPathSystem`.
*   **Refactor:**
    *   Standardize `ITool`: Ensure every tool follows the exact same lifecycle.
    *   **Visuals:** Tools should *request* a preview render from a System, or render to a dedicated `ToolLayer` (container) that is cleared every frame, rather than managing their own `Graphics` lifecycle haphazardly.
    *   **Logic:** `OmniPencilTool` is becoming a "God Tool." Consider splitting "Selection logic" from "Path logic" into reusable helpers/utilities.

### C. System Inter-dependencies
*   **Current State:** `SprigSystem` knows about `MovementPathSystem`. `GraphSystem` knows about `FlowFieldSystem`. Dependencies are passed via constructor.
*   **Refactor:** This is actually okay (Dependency Injection), but it can get messy.
*   **Improvement:** Ensure systems exposing public methods (like `getSprigAt`) are optimized. The current `getSprigAt` iterates 5000 entities. It *must* use the Spatial Hash that `SprigSystem` already has!

### D. Config & Constants
*   **Current State:** `CONFIG` object is huge and nested.
*   **Refactor:** Split config into `GameConfig`, `RenderConfig`, `ToolConfig`. Or keep it but strictly type it (which we started doing). Ensure *no* magic numbers exist in code (e.g. `10 * 10` drag threshold).

## 4. Step-by-Step Execution Plan

### Step 1: Spatial Optimization (Low Risk, High Value)
*   **Task:** Update `SprigSystem.getSprigAt` and `removeSprigsAt` to use the **Spatial Hash Grid**.
*   **Why:** Currently these are $O(N)$ scans. They should be $O(1)$ or $O(K)$. This effectively "finishes" the work started in Phase 1.

### Step 2: System Standardization (Medium Risk)
*   **Task:** Create a `ISystem` interface (`update(dt)`, `resize()`, `container`).
*   **Task:** Ensure all systems (`Map`, `Sprig`, `Flow`, `Graph`, `Path`) implement this.
*   **Task:** Create a `SystemManager` that holds the list of systems and iterates them. This cleans up `Game.ts` update loop.

### Step 3: Tool Rendering Layer (Medium Risk)
*   **Task:** Create a `ToolOverlaySystem` (or similar) that provides a standard `Graphics` context for tools to draw into.
*   **Task:** Refactor `OmniPencilTool.renderCursor` to use this standard context, removing the ad-hoc `cursorGraphics` from `Game.ts`.

### Step 4: Input Controller Extraction (High Risk)
*   **Task:** Move the switch-case hotkey logic from `Game.ts` into `ToolManager` or a new `InputController`.
*   **Why:** `Game.ts` shouldn't care that 'T' means 'Toggle Tool'.

## 5. Pitfalls to Avoid
*   **Over-Engineering:** Don't implement a complex Event Bus if simple function calls work. Dependency Injection is fine.
*   **Breaking the Build:** We saw this happen with `TS6133`. We must be vigilant about cleaning up unused variables *as we refactor*.
*   **UI/DOM Mixing:** Keep HTML (`DebugOverlay`) and Canvas (`Pixi`) separate. Don't try to mix them in the same scene graph (we fixed this, but don't regress).

## 6. How to Request These Changes
When prompting me, tackle one area at a time:
1. ✅ "Refactor SprigSystem to use Spatial Hash for queries."
2. ✅ "Extract System management from Game.ts into a SystemManager."
3. ✅ "Refactor cursor rendering to use a standardized ToolOverlaySystem."
4. ✅ "Move Input handling logic out of Game.ts."
