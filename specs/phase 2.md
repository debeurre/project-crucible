# Phase 2: Controls, Cargo, & Objectives - Progress Tracking

## 1. The Spawning Mechanism (Tap + Hold) - **COMPLETED**
- Input: Press and HOLD on the central Crucible.
- Logic: While holding, spawn X Sprigs per second.
- Visuals: Crucible 'bounces'. Sprigs "pop" out with random velocity.
- Sprig Appearance: Default GREEN circles (`0x90EE90`).
---

## 2. The "Painted Flow" Controls - **NEXT UP**
- **The Grid:** Map is divided into 40x40px cells.
- **Action (Paint):**
  - User DRAGS anywhere on the map (except the Crucible).
  - Calculate vector of drag.
  - Apply that vector to the grid cells under the cursor.
  - Visual: Faint arrows/lines on the ground showing direction.
- **Action (Cut):**
  - If user draws a line roughly perpendicular to existing flow, clear those cells to (0,0).
---

## 3. The Cargo System (Synchronized Layers) - **PENDING**
### Architecture
- Layer 1: `SprigContainer` (Holds the Green Sprigs).
- Layer 2: `CargoContainer` (Holds the Cargo Sprites, rendered *above* Sprigs).
### Logic (The Texture Swap)
- State: Each Sprig has a `cargoType` (0 = None, 1 = Wood/Brown).
- Update Loop:
  1. Move Sprig based on physics/flow.
  2. If `cargoType > 0`:
     - Set partner `CargoSprite` position to `sprig.x`, `sprig.y - 12` (Floating above head).
     - Set `CargoSprite.visible = true`.
     - Set `CargoSprite.tint` to match the Resource (e.g., Brown).
  3. Else:
     - Set `CargoSprite.visible = false`.
### Visual Assets (Procedural)
- Sprig: Green Circle.
- Cargo: Simple Square.
---

## 4. The Core Loop (Source -> Sink) - **PENDING**
- **Object 1: The Resource Node (Wood):**
  - Visual: A Brown Trapezoid (`0x8B4513`).
  - Logic: Infinite supply for now.
- **Object 2: The Crucible (Sink):**
  - Center of screen.
- **Interaction:**
  - Pickup: If Empty Sprig touches Node -> `cargoType = WOOD`, Sprig velocity slows slightly (weight).
  - Dropoff: If Full Sprig touches Crucible -> `cargoType = NONE`, `Score++`.
  - Feedback: Crucibles bounces (temp horizontal squash) on delivery. Floating text `+1`.
---

## 5. Technical Directives (DOD) - **COMPLETED**
- Arrays: `sprigX`, `sprigY` (Float32), `cargoState` (Uint8) - 0: Empty, 1: Carrying.
- Texture Generation: Create a `TextureFactory` that generates textures at startup.
---
