# SPEC: The Precision Pen (Graph Input)

## 1. The Metaphor
The Pen is an **Architect's Tool**. It does not move units directly; it builds **Infrastructure** (Nodes and Roads) that units use to navigate efficiently.

## 2. Input Logic (State Machine)

### State A: IDLE (Ready to Draw)
* **Cursor Behavior:**
    * **Hover Empty:** Cursor is a "New Node" icon (Ghost Dot).
    * **Hover Existing (Node/Building):** Cursor **Snaps** to center. Turns Green/Gold.
* **Input (Touch/Mouse):**
    * **Tap/Click (Empty):** Creates `Node A`. Sets `lastNode = A`. -> Goto **CHAINING**.
    * **Tap/Click (Existing):** Sets `lastNode = Target`. -> Goto **CHAINING**.
    * **Drag Start (Existing):** Sets `lastNode = Target`. -> Goto **DRAGGING**.

### State B: DRAGGING (Previewing a Link)
* **Visuals:**
    * Calculate **Live A* Path** from `lastNode` to Cursor.
    * Draw "Ghost Line" (dashed/faded) following terrain.
    * *Feedback:* If path is blocked/invalid, Ghost Line turns Red.
* **Snapping:**
    * If Cursor comes within `SNAP_RADIUS` (e.g., 40px) of a Building/Node, snap the Ghost Line end to that target.
* **Release:**
    * **On Empty:** Create `Node B`. Create `Link(lastNode, B)`. Set `lastNode = B`. -> Goto **CHAINING**.
    * **On Snap Target:** Create `Link(lastNode, Target)`. Set `lastNode = Target`. -> Goto **CHAINING**.

### State C: CHAINING (Extending the Path)
* **Visuals:** Display the committed graph nodes/links. Highlight `lastNode` (pulsing).
* **Input:**
    * **Tap/Click:** Same logic as IDLE (Appends new segment).
    * **"Commit" Action:** Clears `lastNode`. Returns to **IDLE**.
    * **"Abort" Action:** Removes last added segment.

## 3. Control Scheme Mapping

| Action | Touch Gesture | Mouse / Keyboard |
| :--- | :--- | :--- |
| **Place / Link** | Tap / Drag-Release | Left Click / Drag-Release |
| **Commit (Done)** | Tap "Checkmark" / Toggle Tool | Right Click / Enter / Space |
| **Abort / Undo** | Two-Finger Tap | Escape / Ctrl+Z |

## 4. Graph & Building Logic

### Bidirectional Default
* Links created by the Pen do **not** have a specific "Forward" flow.
* **Data:** The `Edge` stores a reference to a valid path strip.
* **Usage:** Sprigs use the Edge to travel A->B *or* B->A depending on their own goal.

### Building Connections
* **Anchors:** Buildings have specific "Docking Points" (e.g., the front door).
* **Logic:** When snapping to a Building, the Link actually connects to the Building's anchor coordinate, not the sprite center.

## 5. Implementation Priorities
1.  **The "Ghost" Pathfinder:** Implement a fast A* (or even Manhattan distance initially) to draw the preview line in real-time.
2.  **The Snap System:** A simple radius check (`distance(cursor, entity) < threshold`) to lock the cursor.
3.  **The Commit/Cancel Loop:** Ensuring the player doesn't accidentally delete their whole road when they just wanted to stop drawing.