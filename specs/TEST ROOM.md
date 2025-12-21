# TEST ROOM PLAN: METABOLIC DRAIN (V1)

## 1. Goal & Success Criteria
Validate the "Logistics Handshake" between specialized Sprigs and high-precision infrastructure.
* **Success:** The Heart (Castle) is sustained by a continuous flow of berries transported via roads.
* **Failure:** The Heart’s energy bar hits zero because the "Infection" (Germs) severed the supply line or the "Actors" (Sprigs) failed to coordinate.

## 2. World Layout & Static Assets
The map is a "Single-Cell" layout focused on a single artery.
* **The Heart (Home Base):** A **Brown Castle** at the center of the map. It possesses a `ResourceSink` component that drains energy every tick.
* **The Source:** **Dark Green Berry Bushes** with **Pink Circles** located at the periphery.
* **The Artery:** A **Yellow "Sticky Road"** connecting the Castle and the Berry Bushes. This path uses the refactored Pen logic to "hook" onto both building centers.

## 3. The Actors (Mascot Logic)
Units use localized seeking behavior and affinity-based prioritization.

* **Cabbage (Green Circle):**
    * **Behavior**: High affinity for **Green Brush Intents**.
    * **Logic**: Automatically harvests the Berry Bushes and drops **Pink Circles** (Berries) at the road's endpoint.
* **Chest (Yellow Square):**
    * **Behavior**: High affinity for **Yellow Pen Roads**.
    * **Logic**: Scans for Pink Circles at the bush-side road node, carries them along the "Sticky Road" to the Castle.
* **Ingot (Red 45° Cross):**
    * **Behavior**: **"White Blood Cell"** logic.
    * **Logic**: Overrides all work tasks to patrol for Germs. Prioritizes threats within a radius of the Heart or the Road.
* **Germ (Grey Circle w/ Red Eyes):**
    * **Behavior**: **"Infection"** logic.
    * **Logic**: Periodically spawns from the edge and moves strictly toward the Heart.

## 4. Interaction Validation (Omni-Pencil)
The Pencil acts as the manual override for this autonomous loop.
* **Lasso Select**: Used to grab idle Ingots or redirect Chests.
* **Path Order**: Direct move commands that override "Sticky Road" or "Brush Intent" logic.
* **Emergency**: If the logistics line stalls, use the Pencil to manually group units and move them to the "Infection" source.

## 5. Implementation Steps
1.  **Refactor Pen/Graph**: Implement building snapping and road point storage.
2.  **Heart Component**: Add an energy drain variable and UI progress bar to the Castle node.
3.  **Chest Logic**: Update the `SprigSystem` to allow Yellow affinity units to "lock" onto `GraphEdge.points` when carrying cargo.
4.  **Moving Art V2**: Apply Rough.js sketchy textures to the Castle, Roads, and Sprigs to enhance the "Visual Pet" feel.