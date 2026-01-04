import { Application } from 'pixi.js';
import { WorldState } from './core/WorldState';
import { RenderSystem } from './systems/RenderSystem';
import { MovementSystem } from './systems/MovementSystem';
import { HiveMindSystem } from './systems/HiveMindSystem';
import { NavigationSystem } from './systems/NavigationSystem';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from './core/Config';

async function init() {
    console.log("Phoenix Engine Initialized");
    const app = new Application();
    
    await app.init({
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        backgroundColor: 0x1a1a1a,
        antialias: true,
    });

    document.body.appendChild(app.canvas);

    const world = new WorldState();
    const renderSystem = new RenderSystem(app, world);
    const movementSystem = new MovementSystem();
    const hiveMindSystem = new HiveMindSystem();
    const navigationSystem = new NavigationSystem();

    app.ticker.add(() => {
        const dt = app.ticker.deltaMS / 1000;
        hiveMindSystem.update(world);
        navigationSystem.update(world, dt);
        movementSystem.update(world, dt);
        renderSystem.update();
    });
}

init();
