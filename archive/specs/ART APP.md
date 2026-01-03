# SPEC: Contextual Input & UI (Phase 3)

## 1\. The Goal

Transition from "Debug Mode" to "Player Mode."
Create an interface that feels like a **Drawing App** (Procreate/Paint) rather than an RTS.
Enable complex commands (Move vs. Select) using only **Gestures** (Contextual Switch).

## 2\. The Input Manager (`src/systems/InputManager.ts`)

We need to upgrade the input logic to detect **Intent** based on the gesture shape.

### A. The "Gesture Analyzer"

On `pointerup`, analyze the path of points (`state.path`):

1.  **Calculate Loop Gap:** Distance between `path[0]` (Start) and `path[length-1]` (End).
2.  **Logic:**
      * **IF `gap < 60px` AND `pathLength > 100px`:**
          * **Intent:** **LASSO (Select).**
          * **Action:** Close the polygon. Run `SprigSystem.selectUnitsInPoly(path)`.
      * **ELSE:**
          * **Intent:** **FLOW (Paint).**
          * **Action:** Commit the drawn vectors to the `FlowField`.

### B. Real-Time Feedback (The "Snap")

  * **While Dragging:**
      * Check distance to Start Point every frame.
      * **IF `dist < 60px`:** Change the trail color (e.g., White -\> Gold).
      * **Why?** Tells the player "If you let go now, this counts as a Lasso."

## 3\. The UI Overlay (`src/ui/Toolbar.ts`)

Do not use DOM elements if possible; use PixiJS UI or simple HTML overlays for the "Tool" vibe.

### Layout: "The Artist's Desk"

  * **Left Dock (Tools):**
    1.  **Brush (Default):** Draws Flows/Lassos.
    2.  **Eraser:** "Cuts" flows (draws 0-vectors).
    3.  **Stamp:** Taps place a Flag/Building.
  * **Right Dock (Palette / Intents):**
      * Instead of colors, we pick **Commands**.
      * **White:** Standard Flow.
      * **Red:** Aggro Flow (Sprigs attack).
      * **Green:** Harvest Flow (Sprigs seek resources).
      * **Yellow:** Patrol/Orbit.

## 4\. Visuals: The "Ink" Trail

  * **Current:** The red debug lines (`graphics.lineTo`).
  * **Target:** A "wet ink" stroke.
  * **Implementation:**
      * Use a `Rope` or `MeshStrip` for the active trail?
      * **MVP:** Just increase line width to 5px and lower alpha to 0.8. We will apply the "Rough.js" texture to this later.

## 5\. Technical Directives

  * **Point-in-Polygon:** Implement a standard ray-casting algorithm helper function.
  * **Optimization:** Do not run the "Loop Check" every single pixel of drag. Run it every 5-10 pixels (throttle).
  * **State Machine:**
    ```typescript
    enum ToolMode { BRUSH, ERASER, STAMP }
    enum IntentColor { MOVE, ATTACK, HARVEST }
    ```
    Ensure these states filter what happens on `pointerdown`.