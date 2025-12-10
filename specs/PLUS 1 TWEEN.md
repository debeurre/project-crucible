# SPEC: The "+1" Pop (Visual Feedback)

## 1. Goal
Implement a high-performance, "juicy" floating text effect to signal successful resource delivery.
- **Visuals:** A satisfying "Pop" (scale expansion) followed by a "Float and Fade." Font color should match cargo color.
- **Aesthetic:** Must match the "Living Notebook" style using the **Virgil** font (Excalidraw style).
- **Performance:** Must use **BitmapText** and **Object Pooling** to allow 50+ simultaneous indicators without garbage collection stutters.

## 2. Configuration (`src/config.ts`)
All animation variables must be exposed in a new `FLOATING_TEXT` block within the global config. Do not hardcode these values.

**Required Variables to Expose:**
- **Effect String:** '+1'
- **Font Family:** 'Virgil'
- **Font Size:** 24 (default)
- **Animation Timings:**
    - `POP_DURATION`: 0.3 seconds
    - `FLOAT_DURATION`: 0.8 seconds
    - `FLOAT_DISTANCE`: 40 pixels (Upward movement)
- **Easing Functions (GSAP Strings):**
    - `POP_EASE`: "back.out(3)" (The elastic "boing")
    - `FLOAT_EASE`: "power1.in" (Slow start, fast finish)

## 3. Asset Requirements
- **Font File:** `Virgil.woff2` (or `.ttf`).
- **Loader Strategy:**
    - Add the font file to the project `public/fonts/` folder.
    - In the main asset loader, explicitly load this font.
    - **Crucial Step:** Register it as a **BitmapFont** immediately after loading. PixiJS v8 requires generating the BitmapFont from the vector font source to enable high-performance rendering.

## 4. The `FloatingText` System
Create a dedicated system or manager class to handle these effects.

### A. Object Pooling Strategy
Because this effect plays repeatedly, creating `new Text()` every time will cause lag.
1.  **The Pool:** Maintain an array of reusable `BitmapText` objects.
2.  **Get/Spawn:** When an effect is requested:
    - Check the pool for an available (invisible) instance.
    - If none exist, create a new `BitmapText` instance and add it to the container.
    - Reset the instance properties: position, alpha = 1, scale = 0, visible = true.
3.  **Return/Recycle:** When the animation timeline completes:
    - Do **not** destroy the object.
    - Set `visible = false`.
    - Push it back into the available pool.

### B. The Animation Sequence (GSAP Timeline)
Use a GSAP Timeline to orchestrate the two-stage movement.

**Stage 1: The Pop (Arrival)**
- **Target:** Scale X and Y.
- **Action:** Animate from 0 to 1.5 (overshoot) then settle to 1.0.
- **Timing:** Uses `POP_DURATION` and `POP_EASE`.
- **Feel:** This provides the tactile "impact" of the delivery.

**Stage 2: The Float (Departure)**
- **Target:** Position Y and Alpha.
- **Action:**
    - Move the text upward by `FLOAT_DISTANCE`.
    - Simultaneously fade Alpha from 1.0 to 0.
- **Timing:** Uses `FLOAT_DURATION` and `FLOAT_EASE`.
- **Sequencing:** This should overlap slightly with the end of the Pop stage (e.g., start 0.1s before the Pop finishes) to keep the motion fluid.

**Stage 3: Cleanup**
- **Action:** Trigger the "Return/Recycle" logic mentioned in the Pooling strategy.

## 5. Usage Example
The `SprigSystem` or `EconomySystem` will call a simple public method on this manager:
`FloatingTextManager.spawn(x, y, "+1", "PROFIT")`

This method handles all the pooling, tinting, and animation logic internally, keeping the game loop clean.