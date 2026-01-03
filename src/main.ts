import { Application } from 'pixi.js';
import { WorldState } from './core/WorldState';
import { RenderSystem } from './systems/RenderSystem';
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

    const world = new WorldState();
    const renderSystem = new RenderSystem(app, world);

    app.ticker.add(() => {
        renderSystem.update();
    });
}

init();
