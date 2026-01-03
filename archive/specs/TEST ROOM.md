# SPEC: TEST ROOM V1 (THE INFERENCE ENGINE)

## 1. Design Goal
Create a functional "Metabolic Loop" using **Generic Laborers** who infer their roles based on **Context** (Location + Inventory) rather than hard-coded types.

## 2. The Resource System (The "Why")
We need a reason for Sprigs to move.
* **Castle Heart (`ResourceSink`):**
    * **Logic:** Has `energy` (starts at 100). Drains 1 per second. Dies at 0.
    * **Visual:** Brown Castle. Displays a simple floating text status (e.g., "Heart: 84%").
    * **Interaction:** Absorbs "Pink Circles" (Resources) to restore +10 Energy.
* **Berry Bush (`ResourceSource`):**
    * **Logic:** Contains infinite resources but requires `workTime` (2.0s) to harvest.
    * **Visual:** Dark Green Bush.
    * **Interaction:** When a Sprig completes work, it spawns a "Pink Circle" `ResourceEntity` and gives it to the Sprig.

## 3. The Inference Engine (`SprigSystem` Refactor)
Replace the dominant `applyFlowField` logic with a state-based decision tree.

### New State Component
* `states`: Enum (`IDLE`, `HARVESTING`, `HAULING`, `FIGHTING`)
* `timers`: Float (for harvest duration)
* `targets`: EntityID (Road Node, Bush, or Enemy)

### The Decision Logic (`checkContext`)
Every update, a Sprig evaluates its reality:

**A. The "Hauler" Inference (I have stuff)**
* **Trigger:** Inventory is Full (`cargos[i] == 1`).
* **Action:**
    1.  **Find Sink:** Target the Castle Heart.
    2.  **Check Infrastructure:** Scan for a **Pen Tool Road** within `PERCEPTION_RADIUS`.
    3.  **Movement:**
        * *If near Road:* Snap to `edge.points` (from Pen Refactor) and traverse at 1.5x Speed (Conveyor Belt).
        * *If off Road:* Use standard pathfinding to Castle.

**B. The "Harvester" Inference (I am in a Work Zone)**
* **Trigger:** Inventory Empty + Standing on **Green Brush Intent**.
* **Action:**
    1.  **Scan:** Look for `ResourceSource` (Bush) within `PERCEPTION_RADIUS`.
    2.  **Move:** Go to Bush.
    3.  **Work:** Enter `HARVESTING` state (freeze for 2s).
    4.  **Result:** Receive Cargo -> State becomes `HAULING`.

**C. The "Guard" Inference (I am in a Danger Zone)**
* **Trigger:** Standing on **Red Brush Intent**.
* **Action:**
    1.  **Scan:** Look for `Germs` (Enemies).
    2.  **Move:** Intercept.
    3.  **Attack:** On contact, destroy Germ.

**D. The "Wanderer" Fallback**
* **Trigger:** None of the above.
* **Action:** Default Boid flocking / Flow Field following (existing logic).

## 4. Conflict V1 (Simple Spawns)
* **Germ Spawner:** A simple timer in `Game.ts`.
* **Logic:** Every 15 seconds, spawn 1 **Germ** (Grey Circle) at map edge.
* **Behavior:** Germs pathfind directly to the **Castle Heart**.
* **Consequence:** On contact, Castle takes -20 Energy damage.