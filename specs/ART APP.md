
# DESIGN DIRECTIVE: The Alchemist's Interface

## 1. The "Invisible" Input (Contextual Gestures)
We rely on **Intent Recognition** rather than buttons for the primary modes.

### The "Loop Check" Logic
When the player creates a drag input (a path of points) and lifts their finger (`pointerup`):
1.  **Calculate Distance:** Measure the distance between the **Start Point** and the **End Point** of the path.
2.  **Case A: The Closed Loop (Lasso)**
    * **Condition:** `Distance < THRESHOLD` (e.g., 50px).
    * **Interpretation:** The user intended to circle something.
    * **Action:** Close the shape mathematically. Run a "Point-in-Polygon" check. **Select** all Sprigs inside the shape.
3.  **Case B: The Open Line (Flow)**
    * **Condition:** `Distance > THRESHOLD`.
    * **Interpretation:** The user intended to draw a direction.
    * **Action:** Treat the path as a "Brush Stroke." Bake the directional vectors into the **Flow Field**.

### Visual Feedback (The "Snap")
* **While Dragging:** If the cursor gets close to the Start Point (within threshold), **highlight the path** (e.g., turn it Gold) or show a "Link" icon.
* **Why:** This tells the user *before* they release: "I am about to treat this as a Lasso."

## 2. The UI: "Crucible Paint"
Instead of a traditional RTS sidebar (Build, Attack, Stop), we use an **Art App Toolbar**.

### The "Palette" (Right Side)
In an art app, you pick colors. In Crucible, you pick **Alchemical Intents**.
* **White (Salt/Base):** **Move.** Standard movement flow.
* **Red (Sulfur/Aggro):** **Attack.** Sprigs in this flow become aggressive/volatile.
* **Green (Mercury/Flow):** **Harvest.** Sprigs in this flow look for resources.
* **Blue (Aether/Guard):** **Patrol.** Sprigs orbit or guard the area.

### The "Tools" (Left Side)
These act as overrides or modifiers for the gesture engine.
1.  **Brush (Default):** Draws Flow / Lasso (Contextual).
2.  **Eraser (Cut):** Draws "Null" vectors. Clears flow fields.
3.  **Stamp (Build):** Tapping places a building (Resource Node, Wall) instead of moving units.
4.  **Hand (Pan):** Moves the canvas (camera) without affecting the simulation.

## 3. Aesthetic Goal
* **Vibe:** A dirty, magical sketchbook.
* **UI Elements:** Should look like tools lying on a desk (a physical charcoal stick for "Wall," a quill for "Flow").
* **Feedback:** When "painting" a flow, it shouldn't look like a digital vector line. It should look like **ink bleeding into paper** (using the Rough.js texture strategy).