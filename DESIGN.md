# PROJECT CRUCIBLE: DESIGN SPEC (LIVING)

## Current Goal: Discrete A* Rail Fields
We are transitioning from fluid, pheromone-based movement to high-efficiency, discrete rail networks. Sprigs should not wander aimlessly; they should commute.

## Data Structure: The Rail
A **Rail** is a physical path represented as an array of discrete `{ x, y }` coordinates (nodes).
- **Generation:** Rails are generated using A* pathfinding between high-interest points (e.g., Nest and a Resource).
- **Format:** `Rail = Array<{ x: number, y: number }>`.

## Agent Logic: Commuting
Sprigs transition from "Wander/Scent" mode to "Rail" mode when near a high-strength path.
- **Acquisition:** A Sprig finds the closest node on a rail.
- **Traversing:** The Sprig moves linearly along the array index (incremental or decremental based on target).
- **Fluidity:** Sprigs can "derail" if they encounter a higher-priority signal (e.g., fresh food nearby) or a blockage.

## Persistence: The Metabolic Loop
Rails are not permanent infrastructure but biological pathways.
- **Metabolism:** Rails have a `strength` value (0.0 to 1.0).
- **Decay:** Strength decays over time if unused.
- **Reinforcement:** High traffic (Sprigs passing over a node) reinforces the strength.
- **Visuals:** High-strength rails appear as solid packed dirt; low-strength rails appear as faint paths.