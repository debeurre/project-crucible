import { Application } from 'pixi.js';
import { WorldState } from './core/WorldState';
import { RenderSystem } from './systems/RenderSystem';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { SteeringSystem } from './systems/SteeringSystem';
import { JobDispatchSystem } from './systems/JobDispatchSystem';
import { JobExecutionSystem } from './systems/JobExecutionSystem';
import { ToolManager } from './tools/ToolManager';
import { UISystem } from './systems/UISystem';
import { LifecycleSystem } from './systems/LifecycleSystem';
import { SignalSystem } from './systems/SignalSystem';
import { TextureManager } from './core/TextureManager';
import { InputState } from './core/InputState';
import { SCREEN_WIDTH, SCREEN_HEIGHT, CONFIG } from './core/Config';
import { FlowFieldSystem } from './systems/FlowFieldSystem';
import { DEFAULT_LEVEL } from './data/LevelData';
import { UIManager } from './ui/UIManager';

async function init() {
    const app = new Application();
    
    await app.init({
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        backgroundColor: 0x1a1a1a,
        antialias: true,
    });

    document.body.appendChild(app.canvas);
    
    // Initialize Input
    InputState.init(app.canvas);

    const world = new WorldState();
    world.load(JSON.stringify(DEFAULT_LEVEL));

    // Auto-Spawn Sprigs
    const nest = world.structures.find(s => s.type === 0); // Nest
    if (nest) {
        for (let i = 0; i < CONFIG.START_SPRIGS; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * CONFIG.NEST_VIEW_RADIUS;
            const sx = nest.x + Math.cos(angle) * dist;
            const sy = nest.y + Math.sin(angle) * dist;
            world.sprigs.spawn(sx, sy);
        }
    }
    
    // Initialize TextureManager before RenderSystem
    await TextureManager.init(app);

    const toolManager = new ToolManager(world);
    const renderSystem = new RenderSystem(app, world, toolManager);
    const physicsSystem = new PhysicsSystem();
    const steeringSystem = new SteeringSystem();
    const jobDispatchSystem = new JobDispatchSystem();
    const jobExecutionSystem = new JobExecutionSystem();
    const lifecycleSystem = new LifecycleSystem();
    const signalSystem = new SignalSystem();
    const uiSystem = new UISystem(app);
    const flowFieldSystem = new FlowFieldSystem();

    const uiManager = new UIManager(toolManager, world);

    window.addEventListener('keydown', (e) => {
        if (e.key === '1') toolManager.setTool('HAND');
        if (e.key === '2') toolManager.setTool('PAINT');
        if (e.key === '3') toolManager.setTool('BUILD');
        if (e.key === '4') toolManager.setTool('SPAWN');
        if (e.key === '5') toolManager.setTool('ERASER');

        if (e.key === 'p' || e.key === 'P') {
            const data = world.serialize();
            console.log(data); // Backup in console
            navigator.clipboard.writeText(data).then(() => {
                alert("Level JSON copied to clipboard!");
            }).catch(err => {
                console.error("Failed to copy", err);
            });
        }
    });

    app.ticker.add(() => {
        const dt = app.ticker.deltaMS / 1000;
        toolManager.update(world);
        lifecycleSystem.update(world, dt);
        signalSystem.update(world, dt);
        jobDispatchSystem.update(world);
        jobExecutionSystem.update(world, dt);
        flowFieldSystem.update();
        steeringSystem.update(world);
        physicsSystem.update(world, dt);
        
        renderSystem.activeTool = toolManager.getActiveToolName();
        renderSystem.update();
        
        uiSystem.update(world);
        uiManager.update();
    });
}

init();