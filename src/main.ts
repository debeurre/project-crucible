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
    console.log("Phoenix Engine Initialized - Phase 5 Reload");
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

    let debugTimer = 0;

    app.ticker.add(() => {
        const dt = app.ticker.deltaMS / 1000;
        interactionSystem.update(world);
        ecologySystem.update(world, dt);
        hiveMindSystem.update(world);
        navigationSystem.update(world, dt);
        movementSystem.update(world, dt);
        renderSystem.update();

        // Debug Logging
        debugTimer += dt;
        if (debugTimer >= 1.0) {
            debugTimer = 0;
            let activeCount = 0;
            for(let i=0; i<world.sprigs.active.length; i++) if(world.sprigs.active[i]) activeCount++;
            
            console.log(`Active Sprigs: ${activeCount}`);
            if (world.sprigs.active[0]) {
                console.log(`S0 Pos: (${world.sprigs.x[0].toFixed(1)}, ${world.sprigs.y[0].toFixed(1)}) Vel: (${world.sprigs.vx[0].toFixed(1)}, ${world.sprigs.vy[0].toFixed(1)})`);
            } else {
                console.log("S0 Inactive");
            }
        }
    });
}

init();
