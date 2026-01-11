import { Application } from 'pixi.js';
import { WorldState } from './core/WorldState';
import { RenderSystem } from './systems/RenderSystem';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { SteeringSystem } from './systems/SteeringSystem';
import { HiveMindSystem } from './systems/HiveMindSystem';
import { NavigationSystem } from './systems/NavigationSystem';
import { ToolManager } from './tools/ToolManager';
import { EcologySystem } from './systems/EcologySystem';
import { UISystem } from './systems/UISystem';
import { TextureManager } from './core/TextureManager';
import { InputState } from './core/InputState';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from './core/Config';
import { FlowFieldSystem } from './systems/FlowFieldSystem';
import { DEFAULT_LEVEL } from './data/LevelData';
import { Toolbar } from './tools/Toolbar';

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

    // Initialize TextureManager before RenderSystem
    await TextureManager.init(app);

    const renderSystem = new RenderSystem(app, world);
    const physicsSystem = new PhysicsSystem();
    const steeringSystem = new SteeringSystem();
    const hiveMindSystem = new HiveMindSystem();
    const navigationSystem = new NavigationSystem();
    const toolManager = new ToolManager(world);
    const ecologySystem = new EcologySystem();
    const uiSystem = new UISystem(app);
    const flowFieldSystem = new FlowFieldSystem();

    const toolbar = new Toolbar(toolManager, world);

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
        ecologySystem.update(world, dt);
        hiveMindSystem.update(world);
        flowFieldSystem.update();
        navigationSystem.update(world, dt);
        steeringSystem.update(world);
        physicsSystem.update(world, dt);
        
        renderSystem.activeTool = toolManager.getActiveToolName();
        renderSystem.update();
        
        uiSystem.update(world);
        toolbar.update();
    });
}

init();