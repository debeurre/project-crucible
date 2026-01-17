# 🧹 System Health Report

**Generated:** 1/16/2026, 9:18:13 PM
**Total Source Files:** 42

🚨 **ARCHITECTURAL SMELLS DETECTED:** 5

### Legend
- 🟢 Healthy (< 200 LOC)
- 🟡 Warning (> 200 LOC)
- 🔴 Critical (> 300 LOC)

| File | LOC | Status | Issues |
| :--- | :---: | :---: | :--- |
| `src/tools/CommandBrushTool.ts` | 208 | 🟡 WARNING |  |
| `src/systems/RenderSystem.ts` | 192 | 🟢 HEALTHY | Imports src/systems/render/PathRenderer.ts (Spaghetti!), Imports src/systems/render/SprigRenderer.ts (Spaghetti!), Imports src/systems/render/StructureRenderer.ts (Spaghetti!) |
| `src/systems/LifecycleSystem.ts` | 172 | 🟢 HEALTHY |  |
| `src/ui/UIManager.ts` | 156 | 🟢 HEALTHY |  |
| `src/data/EntityData.ts` | 135 | 🟢 HEALTHY |  |
| `src/systems/steering/SteeringBehaviors.ts` | 124 | 🟢 HEALTHY |  |
| `src/systems/JobExecutionSystem.ts` | 119 | 🟢 HEALTHY | Imports src/systems/jobs/HarvestRunner.ts (Spaghetti!) |
| `src/systems/SteeringSystem.ts` | 118 | 🟢 HEALTHY | Imports src/systems/steering/SteeringBehaviors.ts (Spaghetti!) |
| `src/systems/jobs/HarvestRunner.ts` | 115 | 🟢 HEALTHY |  |
| `src/core/WorldState.ts` | 111 | 🟢 HEALTHY |  |
| `src/systems/PhysicsSystem.ts` | 105 | 🟢 HEALTHY |  |
| `src/main.ts` | 102 | 🟢 HEALTHY |  |
| `src/systems/JobDispatchSystem.ts` | 99 | 🟢 HEALTHY |  |
| `src/tools/ToolManager.ts` | 93 | 🟢 HEALTHY |  |
| `src/data/StructureData.ts` | 80 | 🟢 HEALTHY |  |
| `src/core/StructureHash.ts` | 78 | 🟢 HEALTHY |  |
| `src/data/JobData.ts` | 77 | 🟢 HEALTHY |  |
| `src/tools/TerrainTool.ts` | 74 | 🟢 HEALTHY |  |
| `src/core/Grid.ts` | 73 | 🟢 HEALTHY |  |
| `src/systems/render/SprigRenderer.ts` | 72 | 🟢 HEALTHY |  |
| `src/core/SpatialHash.ts` | 69 | 🟢 HEALTHY |  |
| `src/tools/EraserTool.ts` | 64 | 🟢 HEALTHY |  |
| `src/components/Stock.ts` | 63 | 🟢 HEALTHY |  |
| `src/tools/DragTool.ts` | 62 | 🟢 HEALTHY |  |
| `src/core/InputState.ts` | 60 | 🟢 HEALTHY |  |
| `src/data/PathData.ts` | 58 | 🟢 HEALTHY |  |
| `src/tools/BuildTool.ts` | 56 | 🟢 HEALTHY |  |
| `src/core/Config.ts` | 54 | 🟢 HEALTHY |  |
| `src/systems/render/StructureRenderer.ts` | 50 | 🟢 HEALTHY |  |
| `src/systems/UISystem.ts` | 50 | 🟢 HEALTHY |  |
| `src/tools/HarvestSignalTool.ts` | 48 | 🟢 HEALTHY |  |
| `src/tools/SpawnTool.ts` | 48 | 🟢 HEALTHY |  |
| `src/core/TextureManager.ts` | 43 | 🟢 HEALTHY |  |
| `src/data/LevelData.ts` | 37 | 🟢 HEALTHY |  |
| `src/systems/SignalSystem.ts` | 37 | 🟢 HEALTHY |  |
| `src/systems/render/PathRenderer.ts` | 32 | 🟢 HEALTHY |  |
| `src/data/MapData.ts` | 31 | 🟢 HEALTHY |  |
| `src/tools/Tool.ts` | 20 | 🟢 HEALTHY |  |
| `src/tools/ToolConfig.ts` | 20 | 🟢 HEALTHY |  |
| `src/data/SprigState.ts` | 9 | 🟢 HEALTHY |  |
| `src/systems/FlowFieldSystem.ts` | 4 | 🟢 HEALTHY |  |
| `src/vite-env.d.ts` | 2 | 🟢 HEALTHY |  |
