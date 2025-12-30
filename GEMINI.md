# PROJECT CRUCIBLE: CONTEXT & RULES

## 1. THE DEVELOPER (CRITICAL)
- **Input Constraints:** Developer MOSTLY uses a mouse/touchscreen (Tap/Drag). 
- **MINIMAL KEYBOARD CONTROLS:** Do not suggest WASD, arrow keys, or complex hotkeys.
- **Deafness:** Developer is deaf. Do not rely on audio cues. All feedback must be VISUAL (screen shake, flash, floating text, particle bursts).
- **Workflow:** Developer uses 4-6 hour energy blocks. Code must be modular, easy to "pick up and put down."

## 2. THE GAME: "Garden Civ"
- **Genre:** Eusocial Colony Sim (*SimAnt* + *Pikmin* + *Dwarf Fortress*).
- **Core Loop:** Manage a fluid swarm of "Sprigs" via **Indirect Control**.
    - **Input:** Player draws **Traces** (Pheromones) and **Roads** (Infrastructure).
    - **Output:** Sprigs autonomously Harvest, Scavenge, and Haul based on local signals.
- **Economy:** "The Metabolic Loop." Food $\rightarrow$ Crumbs $\rightarrow$ Nest $\rightarrow$ More Sprigs.
- **Vibe:** "Garden Fantasy." Organic, biological, insectoid behavior wrapped in a cute/fairy-tale aesthetic.
- **Key Mechanics:**
    - **Inventory is Destiny:** No unit classes. An empty Sprig looks for work; a full Sprig looks for home.
    - **Physical Resources:** Resources are physical items (Crumbs) on the map, not abstract numbers.
    - **The Leash:** Sprigs wander naturally but are tethered to the Nest or Pheromone Clouds.

## 3. CODING GUIDELINES
- **Strict TypeScript:** No `any`. Use interfaces.
- **Functional over OOP:** Prefer composition and simple functions over deep class inheritance.
- **Config-Driven:** All "magic numbers" (speed, colors, spawn rates) go into `src/config.ts`.
- **Spectacle First:** Visual feedback (squash/stretch, tints, particles) is essential.
- **Shell Safety:** Do NOT chain shell commands with `&&`. Run them sequentially.

## 4. ARCHITECTURE (STRICT)
- **Data vs. View (CRITICAL):** - **Systems** (e.g., `ResourceSystem`) manage **Pure Data** (`{ hp, x, y, type }`).
    - **Renderers** (e.g., `ResourceRenderer`) read that data and manage **PixiJS Sprites**.
    - **Never** store Sprites inside the Logic System.
- **Data-Oriented Design (DOD):** - Use flat `Float32Array` buffers for high-volume entities (Sprigs).
    - Avoid creating thousands of Class Instances for units.
- **Raw Math Only:** Do NOT use `PIXI.Point` methods for physics. Use raw `x/y` numbers to avoid garbage collection pauses.
- **Spatial Optimization:** Use Spatial Hash Grids for neighbor lookups.

## 5. PIXIJS V8 SPECIFICS
- **Initialization:** Use `await app.init({ resizeTo: window })`.
- **Graphics API:** Use `stroke({ width, color })` instead of deprecated `lineStyle`.
- **Texture Robustness:** Prefer `new Graphics().drawCircle().fill()` for simple dynamic shapes rather than `generateTexture`, which can be brittle in v8.

## 6. PROCESS & RATE LIMITS
- **The "Golden Rule" (Refactoring):** - If modifying a complex file (>200 lines, like `SprigSystem.ts`), **REWRITE THE ENTIRE FILE**.
    - **Do NOT** use `replace_string` or partial patches for logic changes. It causes context drift and bugs.
- **Surgical Edits:** Only use `replace_string` for simple config tweaks or one-line bugfixes.
- **Batching:** Perform related edits in a single turn.