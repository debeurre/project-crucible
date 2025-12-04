# SPEC: Map System & Boundaries

## Goals
Move from an infinite "Aquarium" to a grounded "Territory." The Map defines the safe zones.
- **Visuals:** Distinguish "Land" (Safe) from "Void" (Background).
- **Physics:** Sprigs interact with boundaries (Bounce/Slide) or Wrap (Teleport) depending on the map type.

## Configuration (`src/config.ts`)
Map settings should be centralized.
- **Colors (Pastel Palette):**
  - `LAND_COLOR`: `0xa1855f` (Medium Tan - The play area)
  - `BG_COLOR`: `0x9eb1cb` (Blue-ish Grey - The void)
- **Grid Settings (For ProcGen):**
  - `CELL_SIZE`: 10 or 20 (Resolution of the terrain chunks)

## The Map System (`src/systems/MapSystem.ts`)
The Map acts as the "Physics Container."

### 1. Shapes & Logic
The system must support switching between these modes:

* **FULL:**
    * **Visual:** Fills the entire browser window dynamically on resize.
    * **Physics:** Wrapping (X and Y). If `x > width`, `x = 0`.
* **RECT:**
    * **Visual:** Fixed box `1600w x 800h` centered on screen.
    * **Physics:** Hard Walls. Sprigs bounce off edges.
* **SQUARE:**
    * **Visual:** Fixed box `1000w x 1000h`.
    * **Physics:** Hard Walls.
* **CIRCLE:**
    * **Visual:** Radius `500`.
    * **Physics:** Radial Distance check. `if dist > 500`, push inward.
* **PROCGEN (The "Lumpy" Island):**
    * **Algo:** Cellular Automata or Perlin Noise threshold.
    * **Logic:** A boolean grid `isWalkable[x][y]`.
    * **Physics:** Sprigs check the grid. If the target pixel is `false` (Void), they bounce/slide along the normal.
    * **Look:** Jagged, organic coastline.
* **MIRROR:**
    * Same as ProcGen, but mirror the grid data across the X-axis center line.
* **RADIAL:**
    * Same as ProcGen, but mirrored 4-way or rotated.

### 2. Implementation Strategy (Performance)
Since we have 1000+ units, we cannot use complex polygon collision.
* **SDF / Grid Lookup:** The Map class must expose a method `isValidPosition(x, y): boolean`.
* **For Shapes:** Use simple math formulas.
* **For ProcGen:** Look up the coordinates in a pre-generated 2D Grid/Texture. Do **not** raycast against vector shapes.