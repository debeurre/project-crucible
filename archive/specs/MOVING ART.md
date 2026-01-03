# SPEC: Moving Art (Visual Shader Stack)

## Goals
Transform the stark vector graphics of PixiJS into a "Living Painting."
The game should not look like a flash game; it should look like a moving canvas.
The Sprigs (particles) should bleed into the Map, and the Map should feel textured.

## Implementation Strategy
We will apply a stack of **Post-Processing Filters** to the main `WorldContainer`.
* **File:** `src/systems/VisualEffects.ts`
* **Tech:** `PIXI.Container` filters array.

---

## 1. The Base "Pastel" Stack (Default)
This creates the soft, non-digital look by removing sharp pixels and straight lines.

### Filter A: The "Wiggle" (Displacement)
* **Concept:** "Boiling Lines." Simulates hand-drawn animation frames where lines are never perfectly consistent.
* **Tech:** `PIXI.DisplacementFilter`.
* **Implementation:**
    * Generate (or load) a seamless **Perlin Noise** texture.
    * Map this texture to the Displacement Filter.
    * **Animation:** In the game loop, slowly offset the sprite's UVs (`sprite.x += 0.5`). This makes the world ripple gently.

### Filter B: The "Bleed" (Kawase Blur)
* **Concept:** Watercolor bleeding. Sprigs should not be isolated dots; they should blend slightly with their neighbors.
* **Tech:** `PIXI.BlurFilter` (or Kawase for performance).
* **Setting:** Low strength (e.g., `blur = 2` or `4`).
* **Effect:** Softens the hard geometry of the Sprigs/Map.

### Filter C: Paper Grain (Noise)
* **Concept:** Physical media texture.
* **Tech:** `PIXI.NoiseFilter`.
* **Setting:** `noise = 0.1` (10% intensity).
* **Why:** Breaks up the "digital smoothness" of solid color fills.

### Filter D: The "Wet Edge" (Watercolor Threshold)
* **Concept:** Simulates the surface tension of water/paint.
* **Tech:** `PIXI.ColorMatrixFilter` (or custom fragment shader).
* **Logic:**
    1.  Take the **Blurred** result (from Filter B).
    2.  Apply a **High Contrast** pass via ColorMatrix.
    3.  **Result:** The blurry edges become sharp again, but irregular and "organic," looking like pooled liquid rather than a perfect circle.

---

## 2. Advanced Style Profiles (Future Configs)
The system should allow swapping the "Shader Stack" to emulate specific art styles.

### Profile: "Starry Night" (Van Gogh / Impasto)
* **Technique:** **Kuwahara Filter** (Oil Paint Shader).
* **Logic:**
    * This shader looks at a window of pixels (e.g., 5x5).
    * It calculates the variance (messiness) of 4 sectors.
    * It selects the average color of the *least messy* sector.
    * **Visual Result:** Turns noise and gradients into flat, chunky "brush strokes."
* **Additions:**
    * **Flow Map:** Use the velocity of the Sprigs to direct the angle of the brush strokes.
    * **Normal Map:** Apply a lighting pass to make the strokes look raised (3D paint texture).

### Profile: "The Great Wave" (Ukiyo-e / Woodblock)
* **Technique A: Outline (Sobel Operator)**
    * Detects edges based on color difference.
    * Draws a thick, dark line (Ink) around the Sprigs and Map borders.
* **Technique B: Posterization (Quantization)**
    * Limits the color palette. Instead of 16 million colors, snap every pixel to the nearest of 8 specific "Woodblock Ink" colors.
    * Removes smooth gradients, creating the flat, layered look of block printing.
* **Technique C: Paper Overlay**
    * Multiply a "Rice Paper" texture over the entire screen (static image).

---

## 3. Performance Considerations
* **Resolution:** Running complex shaders (like Kuwahara) at 4K is expensive.
* **Optimization:** Render the `WorldContainer` to a `RenderTexture` at **0.5x resolution**, apply the shaders, then upscale it back to the screen.
    * *Bonus:* This naturally increases the "pixel art/impressionist" blurriness.

## 4. Accessibility Note
* **Motion Sickness:** The "Wiggle" (Displacement) can cause nausea if the frequency is too high.
* **Config:** Must include a `CONFIG.VISUALS.WIGGLE_STRENGTH` scalar (0.0 to 1.0) so it can be disabled.