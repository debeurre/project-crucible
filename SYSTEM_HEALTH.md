# 🧹 System Health Report

**Generated:** 1/22/2026, 1:00:12 PM
**Total Source Files:** 46

🚨 **ARCHITECTURAL SMELLS DETECTED:** 7

### Legend
- 🟢 Healthy (< 200 LOC)
- 🟡 Warning (> 200 LOC)
- 🔴 Critical (> 300 LOC)

| File | LOC | Status | Issues |
| :--- | :---: | :---: | :--- |
| `src/systems/ThreatSystem.ts` | 249 | 🟡 WARNING |  |
| `src/systems/RenderSystem.ts` | 209 | 🟡 WARNING | Imports src/systems/render/PathRenderer.ts (Spaghetti!), Imports src/systems/render/SprigRenderer.ts (Spaghetti!), Imports src/systems/render/StructureRenderer.ts (Spaghetti!) |
| `src/tools/CommandBrushTool.ts` | 208 | 🟡 WARNING |  |
| `src/data/EntityData.ts` | 183 | 🟢 HEALTHY |  |
| `src/systems/LifecycleSystem.ts` | 174 | 🟢 HEALTHY |  |
| `src/systems/JobExecutionSystem.ts` | 159 | 🟢 HEALTHY | Imports src/systems/jobs/HarvestRunner.ts (Spaghetti!), Imports src/systems/jobs/PatrolRunner.ts (Spaghetti!) |
| `src/ui/UIManager.ts` | 156 | 🟢 HEALTHY |  |
| `src/systems/JobDispatchSystem.ts` | 133 | 🟢 HEALTHY |  |
| `src/systems/steering/SteeringBehaviors.ts` | 124 | 🟢 HEALTHY |  |
| `src/systems/SteeringSystem.ts` | 122 | 🟢 HEALTHY | Imports src/systems/steering/SteeringBehaviors.ts (Spaghetti!) |
| `src/systems/jobs/PatrolRunner.ts` | 121 | 🟢 HEALTHY |  |
| `src/systems/jobs/HarvestRunner.ts` | 119 | 🟢 HEALTHY | Imports src/systems/evolution/EvolutionService.ts (Spaghetti!) |
| `src/main.ts` | 116 | 🟢 HEALTHY |  |
| `src/core/WorldState.ts` | 111 | 🟢 HEALTHY |  |
| `src/systems/PhysicsSystem.ts` | 105 | 🟢 HEALTHY |  |
| `src/systems/render/SprigRenderer.ts` | 105 | 🟢 HEALTHY |  |
| `src/tools/ToolManager.ts` | 95 | 🟢 HEALTHY |  |
| `src/data/StructureData.ts` | 86 | 🟢 HEALTHY |  |
| `src/core/Config.ts` | 82 | 🟢 HEALTHY |  |
| `src/core/StructureHash.ts` | 78 | 🟢 HEALTHY |  |
| `src/data/JobData.ts` | 78 | 🟢 HEALTHY |  |
| `src/tools/TerrainTool.ts` | 74 | 🟢 HEALTHY |  |
| `src/core/Grid.ts` | 73 | 🟢 HEALTHY |  |
| `src/systems/evolution/EvolutionService.ts` | 73 | 🟢 HEALTHY |  |
| `src/systems/render/StructureRenderer.ts` | 71 | 🟢 HEALTHY |  |
| `src/core/SpatialHash.ts` | 69 | 🟢 HEALTHY |  |
| `src/components/Stock.ts` | 67 | 🟢 HEALTHY |  |
| `src/tools/EraserTool.ts` | 64 | 🟢 HEALTHY |  |
| `src/tools/DragTool.ts` | 62 | 🟢 HEALTHY |  |
| `src/core/InputState.ts` | 60 | 🟢 HEALTHY |  |
| `src/data/PathData.ts` | 58 | 🟢 HEALTHY |  |
| `src/tools/BuildTool.ts` | 56 | 🟢 HEALTHY |  |
| `src/systems/UISystem.ts` | 50 | 🟢 HEALTHY |  |
| `src/tools/HarvestSignalTool.ts` | 48 | 🟢 HEALTHY |  |
| `src/tools/SpawnTool.ts` | 48 | 🟢 HEALTHY |  |
| `src/core/TextureManager.ts` | 43 | 🟢 HEALTHY |  |
| `src/services/CombatService.ts` | 43 | 🟢 HEALTHY |  |
| `src/data/LevelData.ts` | 37 | 🟢 HEALTHY |  |
| `src/systems/SignalSystem.ts` | 37 | 🟢 HEALTHY |  |
| `src/systems/render/PathRenderer.ts` | 32 | 🟢 HEALTHY |  |
| `src/data/MapData.ts` | 31 | 🟢 HEALTHY |  |
| `src/tools/ToolConfig.ts` | 22 | 🟢 HEALTHY |  |
| `src/tools/Tool.ts` | 20 | 🟢 HEALTHY |  |
| `src/tools/PatrolTool.ts` | 19 | 🟢 HEALTHY |  |
| `src/data/SprigState.ts` | 9 | 🟢 HEALTHY |  |
| `src/vite-env.d.ts` | 2 | 🟢 HEALTHY |  |
