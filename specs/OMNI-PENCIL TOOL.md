# OMNI-PENCIL TOOL SPEC

## 1. Design Intent & Role
* **Role:** The "Generalist" / "Director's Hand." It plugs the gaps between the autonomous systems (Brush/Pen). 
* **Philosophy:** "Override and Direct." When autonomous behaviors fail or plans change, the Pencil provides fine-grained, direct RTS control.
* **UX Priority:** Smoothness and "Game Feel" over pixel-perfect precision.
* **Hierarchy:** Pencil commands (Direct Orders) **override** Brush (Intent) and Pen (Logistics) behaviors.

## 2. Tool State Machine
The tool relies on a **Context-Sensitive** input evaluation rather than gesture shape analysis.

### State Variables
* `selection`: Array of currently selected Entity IDs.
* `dragOrigin`: Vector `{x, y}` at `pointerDown`.
* `isDragging`: Boolean, triggers after `MIN_DRAG_DISTANCE`.

### Input Logic Flow

#### A. Input Down (Touch Start)
1.  **Hit Test:** Check what is under the cursor.
    * **Unit:** `targetType = UNIT`
    * **Path Arrowhead:** `targetType = PATH_HANDLE`
    * **Empty Space:** `targetType = EMPTY`
2.  **Action Determination:**
    * **If `targetType == PATH_HANDLE`:** Select the Path (Enter **Edit Mode**).
    * **If `targetType == UNIT`:**
        * If Unit is *not* in `selection`: Clear `selection`, Add Unit, Set **Mode: PREPARE_PATH**.
        * If Unit is in `selection`: Keep selection, Set **Mode: PREPARE_PATH**.
    * **If `targetType == EMPTY`:**
        * If `selection` is **Empty**: Set **Mode: PREPARE_LASSO**.
        * If `selection` has **Units**: Deselect All (Visual feedback), Set **Mode: PREPARE_LASSO**.
            * *Safety Rule:* Clicking empty space clears selection to prevent accidental orders.

#### B. Input Move (Dragging)
* **Mode: PREPARE_LASSO**
    * Render **Dashed Line** polygon following pointer history.
    * *Visual:* Rough/Sketchy aesthetic.
* **Mode: PREPARE_PATH**
    * **Behavior:** Trace a **Polyline/Curve** following the exact pointer movement history (not a straight line from origin).
    * **Visual:** Solid "Ink" trail growing from the `selection.centroid` to the current `pointer`.
    * **End Cap:** Show a **"V" Arrowhead** at the tip of the line.
    * *Note:* This allows drawing complex routes (spirals, flanks, sine waves) that units will follow exactly.

#### C. Input Up (Release)
* **If `!isDragging` (Tap Action):**
    * **Unit:** Select Unit (Exclusive).
    * **Path Handle:** Toggle Path Selection (Show "Destroy" UI).
    * **Empty:** Deselect All.
* **If `isDragging` (Drag Action):**
    * **Mode: PREPARE_LASSO:**
        * Auto-close the polygon loop.
        * Raycast/Hit-test all units inside polygon.
        * Update `selection` with results.
    * **Mode: PREPARE_PATH:**
        * Simplify raw input points (Path Smoothing).
        * Create `MovementPath` Entity (Curve data).
        * Assign `MovementPath` to all units in `selection`.
        * Trigger "Order Received" confirmation.

## 3. Behaviors & Mechanics

### Selection (Lasso/Tap)
* **Tap:** Standard exclusive selection.
* **Lasso:** Exclusive (New Lasso replaces old selection).
* **Visuals:** Selected units display a high-contrast outline or "Glow."

### Movement Path (The Order)
* **Entity:** The Path is a physical entity in the game world, not just a momentary UI element.
* **Behavior:**
    1.  Units pathfind to the **Start** of the drawn path (or snap to the closest point *forward* if starting inside the group).
    2.  Units traverse the path nodes strictly to the **End**.
    3.  **Override:** While on a `MovementPath`, units **ignore** all Brush Intents (Green/Red/Yellow).
* **Lifecycle:**
    * Created on Drag Release.
    * **Fades and Destroys** automatically when all assigned units reach the destination.

### Path Interaction (Cancel/Edit)
* **Handle:** The "V" Arrowhead at the end of the path serves as the interactive handle.
* **Select Path:** Tapping the Arrowhead selects the path.
* **Destroy:** When selected, a **Red X** button appears near the Arrowhead. Tapping it:
    * Destroys the `MovementPath` entity.
    * Clears orders from all attached units (Units revert to Idle/Brush behaviors).

## 4. Technical Requirements
* **Input Manager:** Must distinguish `Tap` vs `Drag` (using `dragThreshold`).
* **Hitbox Priority:** `PathHandle` > `Unit` > `Terrain`.
* **Curve Data:** The `MovementPath` must store the smoothed list of points from the drag history, not just Start/End vectors.