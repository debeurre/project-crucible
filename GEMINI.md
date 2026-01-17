# PROJECT GARDENREALM: CONTEXT & RULES

## CURRENT PHASE: JOB SYSTEM WRAP-UP
As of JAN-16-2026: Metabolic loop and player UI restored then greatly enhanced. Codebase refactored to deflate bloated classes.

## 1. THE DEVELOPER (CRITICAL)
- **Input Constraints:** Developer MOSTLY uses a mouse/touchscreen (Tap/Drag). 
- **MINIMAL KEYBOARD CONTROLS:** Do not suggest WASD, arrow keys, or complex hotkeys.
- **Deafness:** Developer is deaf. Do not rely on audio cues. Feedback must be VISUAL FIRST (screen shake, flash, floating text, particle bursts).
- **Workflow:** Developer uses 4-6 hour energy blocks. Code must be modular, easy to "pick up and put down."
- **Preference for User Edits:** When there is ambiguity about whether a tweak is from the user or the agent, PREFER THE USER'S EDITS. Ask if unsure.

## 2. THE GAME: "Gardenrealm"
- **Genre:** Garden Eusocial Colony Sim (*SimAnt* + *Pikmin* + *Dwarf Fortress*).
- **Core Loop:** Manage a swarm of "Sprigs", small garden sprites, via direct and indirect control.
    - **Input:** Player can micromanage or leave signals.
    - **Output:** Sprigs autonomously Scavenge, Haul, Fight, Build and Explore based on signals/need.
- **Vibe:** "Garden Fantasy." Organic, biological, insectoid behavior wrapped in a cute/fairy-tale aesthetic.
- **Key Mechanics:**
    - **Autonomous Survival:** An idle Sprig looks for work; an occupied Sprig executes tasks to sustain its nest. Equilibriums emerge without player intervention.
    - **Adaptive Evolution:** No preset classes. Sprigs are generalists that specialize as they work and engage with their environment.
    - **Physical Resources:** Resources are physical items on the map, not only abstract numbers.

## 3. CODING GUIDELINES
- **Strict TypeScript:** No `any`. Use interfaces.
- **Config-Driven:** All "magic numbers" (speed, colors, spawn rates) go into `src/config.ts`.
- **Shell Safety:** DO NOT chain shell commands with `&&`. Run them sequentially.
- **No Hidden Effects:** Avoid Event Emitters/Listeners for game logic. Prefer polling or direct function calls. Hidden side effects make debugging difficult.
- **Code Bonsai:** Do not exceed 300 LOC per file. If unavoidable, report to developer and/or run `npm run janitor` to monitor health.

## 4. ARCHITECTURE (STRICT)
- **Entity-Component-Systems (ECS):** Prefer composition and simple functions over deep class inheritance. Avoid state in **Systems**. **Systems** (e.g., `HivemindSystem`) manage **Pure Data** (`{ hp, x, y, type }`).
- **Data-Oriented Design (DOD):** Use flat `Float32Array` buffers for high-volume entities (Sprigs). The 'target' is a smooth 60fps at 500+ entities/objects.
- **Hybrid over Pure ECS-DOD:** Use of traditonal objects and patterns for rapid iteration is encouraged if the gains from enforcing architectural purity would be minimal at best.
- **Separate Data from View:** **Renderers** (e.g., `RenderSystem`) read that data and manage **PixiJS Sprites**. **Never** store Sprites inside the Logic System.
- **Raw Math Only:** Do NOT use `PIXI.Point` methods for physics. Use raw `x/y` numbers to avoid garbage collection pauses.
- **Spatial Optimization:** Use Spatial Hash Grids for neighbor lookups.

- **UI Architecture:** 
    - **World Overlay (Cursors, Indicators):** Rendered in **PixiJS** via `RenderSystem`. Must live in World Space to support future camera transforms.
    - **Controls (Toolbar, Menus):** Rendered in **DOM (HTML/CSS)** via `src/ui`. This allows for rapid iteration of layout and native accessibility/input features.

## 5. PIXIJS V8 SPECIFICS
- **Initialization:** Use `await app.init({ resizeTo: window })`.
- **Graphics API:** Use `stroke({ width, color })` instead of deprecated `lineStyle`.

## 6. PROCESS & RATE LIMITS
- **The "Golden Rule" (Refactoring):** - If modifying a complex file (>200 LOC), **REWRITE THE ENTIRE FILE**.
    - **Do NOT** use `replace_string` or partial patches for logic changes. It causes context drift and bugs.
- **Surgical Edits:** Only use `replace_string` for simple config tweaks or one-line bugfixes.
- **Batching:** Perform related edits in a single turn.