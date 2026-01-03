# Project Crucible: Eusocial Garden Sim

## Core Concepts

*   **Grid-Based Map:** 2D Array for Terrain (Walls), Scents (Pheromones), and Influence (Danger).
*   **Entity Component System (DOD):** Flat arrays (Float32Array) for all unit data.
*   **Hybrid Movement:** Units float on x,y but steer based on Grid Flow Fields.

## Architecture

*   **WorldState:** Holds all Data (Map + Entities).
*   **Systems:** Pure logic functions (Decision, Navigation, Ecology).
*   **Renderer:** Pure PixiJS view.

## The Loop

1.  **Input:** Capture player Traces.
2.  **Ecology:** Update Pheromone Grid (Decay/Spread).
3.  **HiveMind:** Assign States (Haul/Scavenge) based on Inventory.
4.  **Navigation:** Calculate Velocities (Flow Field + Steering).
5.  **Physics:** Integrate Positions (pos += vel * dt).
6.  **Render:** Sync Sprites to Positions.
