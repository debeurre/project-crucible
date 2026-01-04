import { Application } from 'pixi.js';
import { WorldState } from './core/WorldState';
import { RenderSystem } from './systems/RenderSystem';
import { MovementSystem } from './systems/MovementSystem';
import { HiveMindSystem } from './systems/HiveMindSystem';
import { NavigationSystem } from './systems/NavigationSystem';
import { InteractionSystem } from './systems/InteractionSystem';
import { EcologySystem } from './systems/EcologySystem';
import { InputState } from './core/InputState';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from './core/Config';

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
    const renderSystem = new RenderSystem(app, world);
    const movementSystem = new MovementSystem();
    const hiveMindSystem = new HiveMindSystem();
    const navigationSystem = new NavigationSystem();
    const interactionSystem = new InteractionSystem();
    const ecologySystem = new EcologySystem();

    app.ticker.add(() => {
        const dt = app.ticker.deltaMS / 1000;
        interactionSystem.update(world);
        ecologySystem.update(world, dt);
        hiveMindSystem.update(world);
        navigationSystem.update(world, dt);
        movementSystem.update(world, dt);
        renderSystem.update();
    });
}

init();
