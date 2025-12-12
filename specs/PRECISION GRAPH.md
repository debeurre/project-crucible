## Phase 3 Spec: Graph-Based Precision Paths

### 1. Goal: Decouple Input from Simulation

The core problem is that player input (touch/drag) directly manipulates the Flow Field vectors, leading to "noise." The solution is to introduce a **Graph Layer** which acts as a reliable intermediary.

* **Input (Messy):** Player drags and shakes their finger.
* **Logic (Perfect):** The `GraphSystem` registers only the start and end points. It uses a `Pathfinder` to calculate a smooth, clean path.
* **Flow Field (Reliable):** The clean path is **baked** into a high-priority layer of the Flow Field.

### 2. New Data Structures (`src/types/GraphTypes.ts`)

We define the building blocks of the path network:

| Structure | Description | Key Fields |
| :--- | :--- | :--- |
| **`Node`** | A static point: a Building, a Resource, or a player-placed Waypoint. | `id`, `x`, `y`, `type` (`WAYPOINT`, `BUILDING`, etc.) |
| **`Edge`** | A persistent road/link between two Nodes. | `id`, `nodeAId`, `nodeBId`, `intent` (`TaskIntent`), `isActive` |
| **`TaskIntent`** | The purpose/job assigned to Sprigs on a path (replaces general "color"). | `GREEN_HARVEST`, `RED_ATTACK`, `BLUE_SCOUT`, `YELLOW_ASSIST` |

### 3. Core System Logic

#### A. `GraphSystem.ts` (New System)

* **Role:** Manages the graph of Nodes and Edges. This is the **Precision Tool** (`Pen`) logic layer.
* **`createLink(NodeA, NodeB, intent)`:**
    1.  Creates a new `Edge` object.
    2.  Calls the new `Pathfinder` utility to find a clean path (list of grid cells).
    3.  Calls the updated `FlowFieldSystem` to **bake** the precise path vectors into the High-Priority layer.
* **`addNode(x, y)`:** Used by the Pen Tool to create Waypoints in open terrain for curved routes.

#### B. `Pathfinder.ts` (New Utility)

* **Role:** A utility function to calculate a path based on the terrain.
* **Logic:** Given two points, it uses a pathfinding algorithm (e.g., A\*) to return a list of smooth, non-conflicting grid coordinates. Initially, this can be a simple straight-line calculation before adding obstacle avoidance.
* **Output:** A list of `GridCoord` objects (`{ gx, gy }`).

#### C. `FlowFieldSystem` (Update for Priority)

The Flow Field grid must now store two vector layers per cell to manage the tool priority:

| Layer Name | Source Tool | Priority Rule |
| :--- | :--- | :--- |
| **`graphVector`** | `Pen` Tool (via `GraphSystem`) | **HIGH PRIORITY:** Used for steering Sprigs if its magnitude is non-zero. |
| **`manualVector`** | `Pencil` Tool (Freehand Draw) | **LOW PRIORITY:** Only used for steering if `graphVector` is zero. |

* **`bakeGraphPath(edgeId, path, intent)`:** Writes smooth, persistent vectors *only* to the `graphVector` layer along the calculated path.

#### D. `SprigSystem` (Update for Movement)

The logic for how a Sprig chooses its movement vector must enforce the priority:

1.  **Check Graph Layer:** The Sprig reads the flow vector at its current location. If the **`graphVector`** is present (non-zero), the Sprig uses it for movement and adopts the path's `TaskIntent` (e.g., if it's a `RED_ATTACK` path, the Sprig is now on an attack mission).
2.  **Check Pencil Layer:** Only if the `graphVector` is empty, the Sprig uses the **`manualVector`** (the old painted field) as a directional suggestion.

### 4. Precision Tools Overlap Summary

| Tool | Resulting Flow Field Layer | Priority |
| :--- | :--- | :--- |
| **`Pen`** (Node Linking) | `graphVector` | **High** (Precision logistics, Combat, Exploration routes) |
| **`Pencil`** (Freehand Drag) | `manualVector` | **Low** (Temporary repositioning, Quick gestures) |