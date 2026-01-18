# PROJECT GARDENREALM: CONTEXT & RULES

## CURRENT FOCUS: CLEANING AND ORGANIZATION
As of JAN-17-2026: Housekeeping before next phase (threats).

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
- **Hybrid ECS-DOD:** Logic is separated into Systems; data is stored in SSOT buffers (WorldState).
- **File Limits:** Do not exceed 300 LOC per file. Use specialized Runners and Behaviors to delegate complexity.
- **Reference:** See `ARCHITECTURE.md` for the full technical map, tick order, and glossary.

## 5. PIXIJS V8 SPECIFICS
- **Initialization:** Use `await app.init({ resizeTo: window })`.
- **Graphics API:** Use `stroke({ width, color })` instead of deprecated `lineStyle`.

## 6. PROCESS & RATE LIMITS
- **The "Golden Rule" (Refactoring):** - If modifying a complex file (>200 LOC), **REWRITE THE ENTIRE FILE**.
    - **Do NOT** use `replace` or partial patches for logic changes. It causes context drift and bugs.
- **Surgical Edits:** Only use `replace` for simple config tweaks or one-line bugfixes.
- **Batching:** Perform related edits in a single turn.