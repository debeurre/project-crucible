## **THE TRAILBLAZER REVISION (Current)**

### **1. Context & Rationale**

This project has undergone three distinct evolutionary phases regarding unit navigation, each attempting to solve the balance between **Scale (500+ units)** and **Organic Feel ("Garden Fantasy")**.

* **Phase A: Scalar Pheromones (The Smell).**
* *Approach:* Units deposited intensity values (0.0–1.0) on a grid.
* *Result:* Good for general attraction, but lacked directional precision. Units would "swim" up gradients rather than commute efficiently.


* **Phase B: Discrete Rails (The Metro).**
* *Approach:* Global A* pathfinding generated static, spline-smoothed highways.
* *Result:* Highly efficient but visually rigid. Created "SimCity" artifacts (wiggly staircases) and struggled with dynamic obstacles. The "Global Brain" approach felt robotic.


* **Phase C: Flow Fields (The Trailblazer).**
* *Trigger:* The realization that "Desire Paths" (Ant Colony Optimization) produce superior organic results than pre-calculated Splines.
* *The Shift:* We are moving from **Pathfinding** (calculating a route beforehand) to **Pathforming** (emerging a route through behavior).



### **2. Abstract: The Flow Field Architecture**

The "Trailblazer" system replaces global pathfinding with a decentralized **Steering & Flow** model. This returns to the project's earliest prototype roots but leverages the new, robust DOD-ECS architecture for performance.

* **The Scout (Lizard Brain):**
* Units no longer ask the server for a path. They use **Local Steering Behaviors** (Raycasting & Tangent Following) to navigate immediate obstacles.
* *Benefit:* Infinite scalability. A unit only cares about the 40px in front of it.


* **The Recorder (Hive Memory):**
* Successful units (those carrying food) do not just return home; they "paint" the grid with **Velocity Vectors** pointing toward their goal.
* *Benefit:* "Spaghetti Merging" is solved mathematically. If one unit says "North" and another says "West," the grid naturally becomes "North-West."


* **The Follower (The Current):**
* Empty units sensing a Flow Field simply adopt the cell's vector as a steering force.
* *Result:* Units flow like water. They bank around curves, merge into highways, and naturally form "Dendritic" (tree-like) transport networks without any complex code.



### **3. Technical Imperatives**

* **Removal:** A* Pathfinder, Spline Smoothing, and Rail Systems are deprecated.
* **Addition:** `SteeringSystem` (Reynolds behaviors) and `FlowField` (Vector Grid `Float32Array`).
* **Constraint:** All navigation must be reactive. No unit shall possess "Global Knowledge" of a path beyond the next few grid cells.