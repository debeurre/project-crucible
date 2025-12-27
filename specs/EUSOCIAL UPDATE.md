# Design Overview: The "Eusocial" Update

We are transitioning from "RTS Unit Logic" (Command & Control) to "Ant Colony Logic" (Stimulus & Response).

## Phase 1: The Pile (The Foraging Instinct)

* **Metaphor:** "Leafcutter ants dropping leaves."
* **The Change:** Decoupling **Harvesting** from **Hauling**.
* **Behavior:**
* **Context:** Sprig is in **Green Pheromone** (Intent) + Near Bush.
* **Action:** Harvest for 2s  Spawn a physical **Berry Item** on the ground  Repeat.
* **Result:** You will see huge piles of pink berries accumulating around your bushes. This creates the "Supply" pressure visually.

## Phase 2: The Road (The Trail Instinct)

* **Metaphor:** "Ants finding a pheromone trail."
* **The Change:** Replacing the "Yellow Brush" with the **Pen Tool**.
* **Behavior:**
* **Context:** Sprig is Idle + Sees **Berry Pile** + Sees **Road Node** (Pen Line).
* **Action:** Pick up Berry  Snap to Road  Follow path to Castle  Drop.
* **Result:** Roads become literal conveyor belts. If you delete a road, the flow stops immediately.

co## Phase 3: The Alarm (The Soldier Instinct)

* **Metaphor:** "Soldier ants responding to alarm pheromones."
* **The Change:** Zoning as a "Leash."
* **Behavior:**
* **Context:** Sprig is in **Red Pheromone** (Intent) + Sees Enemy.
* **Action:** Intercept and Attack.
* **Constraint:** If the enemy leaves the Red Zone, the Sprig disengages and returns to patrol. This prevents your workers from being kited to death.