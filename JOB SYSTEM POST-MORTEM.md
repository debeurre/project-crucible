# 📝 Post-Mortem: Job System & Survival Cycle
**Branch:** `job-system` (formerly `trail-field-rewrite`)
**Date:** January 16, 2026

## 1. Executive Summary
This branch marked a critical pivot in *Gardenrealm's* development. While originally intended to restore "Trailfields" (Flow Fields), the unexpected robustness of the "Gig Economy" Job System led to a strategic shift. We successfully implemented a semi-autonomous metabolic loop, enhanced user agency through macro/micro controls, and performed a major architectural refactor to ensure long-term maintainability.

## 2. Key Deliverables

### **Autonomous Survival (The Metabolic Loop)**
- **LifecycleSystem:** Implemented a three-stage hunger cycle (Satisfied, Hungry, Starving). Sprigs now consume food from their Nest, impacting their speed and survival.
- **Spawning Logic:** Nests now autonomously consume surplus food to "invest" in new population, governed by a `HUNGER_BUFFER`.
- **Regenerating Resources:** Added `BUSH` structures that replenish food over time, creating stable but limited resource nodes.

### **Hivemind Knowledge (Scouting & Gossip)**
- **Memory Buffer:** Sprigs now possess a fixed-size short-term memory (`discoveryBuffer`) to record resource sightings while on other tasks.
- **Gossip Mechanic:** Returning Sprigs transfer their discoveries to the Nest's `knownStructures` list, allowing the colony to "scout" the map organically.

### **User Agency (Command & Signal)**
- **HarvestSignalTool (Macro):** Allows the player to designate high-priority zones, overriding autonomous logic to focus swarm effort.
- **CommandBrushTool (Micro):** Implemented a "Scent Trail" system using segmented waypoints. Players can "pencil-in" exact paths for selected Sprigs to follow.

## 3. Architectural Evolution
- **The Pivot:** Flow fields were deprioritized. The Job System + Steering proved efficient enough at current scales (500+ units), allowing us to return to the roadmap sooner.
- **System Decomposition:** Monolithic systems (`RenderSystem`, `SteeringSystem`, `JobExecutionSystem`) were broken down into modular "Renderers", "Runners", and "Behaviors".
- **UI Consolidation:** Transitioned from scattered DOM manipulation to a centralized `UIManager` with external CSS, reducing UI-related code in logic files by ~70%.

## 4. Challenges & Lessons Learned
- **DOD vs. JSON:** Encountered a bug where `Infinity` (Nest capacity) was lost during JSON serialization (`null`). Solved via a smart `Stock.deserialize` method.
- **State Overrides:** Manual player commands (`FORCED_MARCH`) were initially overwritten by autonomous idle logic. This highlighted the need for a strict "State Hierarchy" in the `JobExecutionSystem`.
- **Render Order:** Debug indicators (Selection arrows) were being cleared by the very system drawing them due to timing issues in the `update` loop.

## 5. System Health Final State
- **Critical Files:** 0
- **Warning Files:** 1 (`CommandBrushTool.ts` - complex interaction logic)
- **LOC status:** All core systems brought under the **300 LOC limit**.
- **Performance:** Maintained 60fps with 500 active sprigs while running hunger, scouting, and path-following logic.

## 6. Future Outlook
The "Garden Fantasy" vision is now technically supported by a stable metabolic loop. The next phase will focus on **Specialization and Combat**, as Sprigs begin to evolve based on the tasks they perform most frequently in this new "Gig Economy."
