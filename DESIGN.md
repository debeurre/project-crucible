## **TRAILFIELD REWRITE**

### **1. Context & Rationale**
This project has undergone three distinct evolutionary phases regarding unit navigation, each attempting to solve the balance between **Scale (500+ performant units)** and **Organic Feel ("Garden Fantasy")**.

* **Phase A: Scalar Pheromones (The Smell).**
* *Approach:* Units deposited intensity values (0.0–1.0) on a grid.
* *Result:* Good for general attraction, but lacked directional precision. Units would "swim" up gradients rather than commute efficiently.

* **Phase B: Discrete Rails (The Metro).**
* *Approach:* Global A* pathfinding generated static, spline-smoothed highways.
* *Result:* Highly efficient but visually rigid. Created "SimCity" artifacts (wiggly staircases) and struggled with dynamic obstacles. The "Global Brain" approach felt robotic.

* **Phase C: Flow Fields (The Trailfield).**
* *Trigger:* The realization that "Desire Paths" (Ant Colony Optimization) produce superior organic results than pre-calculated Splines.
* *The Shift:* We are moving from **Pathfinding** (calculating a route beforehand) to **Pathforming** (emerging a route through behavior).

### **2. Codebase Flush and Rewrite**
A short-lived attempt at migrating to the flow fields ran into a series of subtle bugs, necessitating a deep purge of built up code cruft, followed by a rewrite from primitives.

The target remains a 'flow field' architecture. This document will be updated as the rewrite progresses.

### **3. Rebuilding from Primitives**
We cleaned the codebase and are now restoring tooling in tandem with entities, layer by layer. The near term target is being able to construct and manipulate a 'hardcoded level' live, even if all entities are inert.

Devtools were greatly expanded during this pass to smoothly manipulate levels, included a rudimentary serializer and loader.

### **4. Naive Steering and Robustness Tests**
We are restoring autonomous function gradually with the simplest behaviors like seeking, boids, collision avoidance, interaction buffer, etc. Short term target is iterating towards a metabolic loop (spawn -> find cookie -> haul to nest -> spawn...).

Sprig behavior should withstand user interruption and automatially reconfigure to adapt to a changing landscape.