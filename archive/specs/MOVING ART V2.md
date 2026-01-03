# SPEC: Moving Art (Procedural Sketch)

## 1. The Aesthetic Target
- **Reference:** Excalidraw / Kirby's Dream Land 3.
- **Concept:** "Living Notebook."
- **Technique:** Do NOT use post-processing shaders. Use **Procedural Texture Generation**.

## 2. The "RoughGenerator" Class
We need a utility class that generates textures at runtime using `Pixi.Graphics` or an off-screen HTMLCanvas.

### Algorithms to Implement (The "Hand-Drawn" Math)
1.  **Jittered Line:**
    - Input: Start(x,y), End(x,y).
    - Logic: Break the line into segments. Offset midpoints by `Math.random() * roughness`.
    - Draw: `moveTo(start)` -> `quadraticCurveTo(mid + offset, end)`.
2.  **Double Pass:**
    - Draw every shape twice with slightly different offsets.
3.  **Hachure Fill (The "Scribble"):**
    - Do not use `graphics.fill()`.
    - Logic: Calculate angle (e.g., -45deg). Draw lines across the bounding box of the shape. Mask them to the shape's radius.

## 3. The "Wiggle" Animation (Sprite Sheet)
To make the swarm feel alive without expensive real-time math:
- **Pre-Render:** For the "Sprig" entity, generate **3 different texture variants** (Seed A, Seed B, Seed C) at startup.
- **Runtime:** properties `animatedSprite.textures = [texA, texB, texC]`.
- **Loop:** Play at 10-12 FPS (Stop-motion feel).

## 4. Implementation Steps
1.  Install `roughjs` (npm install roughjs).
    - *Why?* Don't reinvent the wheel. It's lightweight and does exactly this math.
2.  Create `src/systems/TextureFactory.ts`.
    - Uses `rough.canvas(tempCanvas)` to draw a primitive.
    - Converts `tempCanvas` to `PIXI.Texture.from(tempCanvas)`.
3.  Update `SprigSystem`:
    - Instead of `graphics.drawCircle()`, assign `sprite.texture = TextureFactory.get('sprig_frame_1')`.