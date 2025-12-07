# PROJECT CRUCIBLE: CONTEXT & RULES

## 1. THE DEVELOPER (CRITICAL)
- **Input Constraints:** I can ONLY use a mouse/touchscreen (Tap/Drag). 
- **NO KEYBOARD CONTROLS:** Do not suggest WASD, arrow keys, or complex hotkeys.
- **Deafness:** I am deaf. Do not rely on audio cues. All feedback must be VISUAL (screen shake, flash, floating text, particle bursts).
- **Workflow:** I use 4-6 hour energy bursts. Code must be modular and easy to "pick up and put down."

## 2. THE GAME: "Crucible Swarm"
- **Genre:** Particle-based Colony Sim (Pikmin meets Falling Sand).
- **Core Loop:** Drag to direct a fluid swarm of "Sprigs" to harvest physical resources, complete objectives, defend territory.
- **Vibe:** Medieval high fantasy with alchemy theme. High Spectacle.
- **Tech Stack:** TypeScript, Vite, PixiJS (v8.5+).

## 3. CODING GUIDELINES
- **Strict TypeScript:** No `any`. Use interfaces.
- **Functional over OOP:** Prefer composition and simple functions over deep class inheritance.
- **Config-Driven:** All "magic numbers" (speed, colors, spawn rates) go into `src/config.ts`.
- **Spectacle First:** If a mechanic doesn't have visual juice (particles, tweens), it is not finished.
- **Shell Safety:** Do NOT chain shell commands with `&&` (e.g., `git add . && git commit`). Run them as separate tool calls to avoid safety filter rejections.

## 4. ARCHITECTURE & PERFORMANCE
- **Simulation vs. Render:** Keep the math (logic) separate from the PixiJS (view).
- **ECS-Lite:** Use a simple Entity-Component structure to handle 1000+ sprites efficiently.
- **Data-Oriented Design (DOD):** Prefer **Structure of Arrays (SoA)** over Array of Structures (AoS).
    - **Implementation:** Use flat `Float32Array` buffers for high-volume data (e.g., `positions[id * 2]`, `velocities[id * 2]`) rather than creating thousands of individual Sprig objects.
- **Raw Math Only:** Do NOT use `PIXI.Point` methods for physics (e.g., NO `.add()`, `.magnitude()`, `.normalize()`). 
    - **Why?** They require the `math-extras` mixin and create garbage.
    - **Do:** Use raw `x` and `y` numbers in loops.

## 5. PIXIJS V8 SPECIFICS (STRICT)
- **Initialization:** `Application` startup is ASYNC. Use `await app.init({ resizeTo: window })`.
- **Graphics API:** `lineStyle` is deprecated. Use `moveTo` -> `lineTo` -> `stroke({ width, color, alpha })`.
- **Events:** `interactive = true` is deprecated. Use `eventMode = 'static'` (for background/stage) or `'dynamic'`.
- **Hit Testing:** The Stage needs `app.stage.hitArea = app.screen` to detect clicks on empty space.
- **Texture Generation (Robustness):** When creating simple shapes for tinting (e.g., Sprigs, Cargo), prefer using `new PIXI.Graphics().drawCircle().fill()` directly for each object rather than `app.renderer.generateTexture(graphics)` for a base texture. The latter can be prone to timing or rendering context issues with v8's `generateTexture` if not managed carefully, leading to invisible sprites. Using direct `Graphics` ensures immediate and reliable rendering.