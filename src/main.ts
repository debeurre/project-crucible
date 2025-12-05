// src/main.ts
import { Application, Graphics } from 'pixi.js'; // Named imports are better for tree-shaking
import { SprigSystem } from './SprigSystem';
import { createInputManager } from './InputManager';
import { CONFIG } from './config';
import { MapSystem, MapShape } from './systems/MapSystem';

// State for screen shake (managed inside the loop now)
let shakeIntensity = 0;

async function main() {
    // 1. Create the application
    const app = new Application();

    // 2. Initialize (v8 Async Pattern)
    // using 'resizeTo: window' automatically handles canvas resizing
    await app.init({
        resizeTo: window, 
        backgroundColor: 0x1a1a1a,
        antialias: true,
    });

    document.body.appendChild(app.canvas);
    
    // --- DEBUG UI ---
    const debugDiv = document.createElement('div');
    debugDiv.style.position = 'absolute';
    debugDiv.style.bottom = '20px';
    debugDiv.style.right = '20px';
    debugDiv.style.color = 'white';
    debugDiv.style.fontFamily = 'monospace';
    debugDiv.style.fontSize = '24px';
    debugDiv.style.pointerEvents = 'none'; // Let clicks pass through
    debugDiv.style.textShadow = 
        '-2px -2px 0 #000, ' +
        '2px -2px 0 #000, ' +
        '-2px 2px 0 #000, ' +
        '2px 2px 0 #000';
    debugDiv.textContent = 'MODE: RECT';
    document.body.appendChild(debugDiv);

    const inputState = createInputManager(app); // Renamed to inputState

    // Initialize Systems
    const mapSystem = new MapSystem(app);
    app.stage.addChild(mapSystem.container);

    const sprigSystem = new SprigSystem(app, mapSystem);

    // Handle resize
    app.renderer.on('resize', () => {
        mapSystem.resize();
    });

    // 3. Graphics Setup
    const pheromonePath = new Graphics();
    app.stage.addChild(pheromonePath);

    // 4. The Game Loop (Ticker)
    // v8 passes 'ticker' to the callback which contains deltaTime
    app.ticker.add((ticker) => {
        // --- DEBUG INPUT ---
        if (inputState.debugKey) {
            switch (inputState.debugKey) {
                case '1': mapSystem.setMode(MapShape.FULL); break;
                case '2': mapSystem.setMode(MapShape.RECT); break;
                case '3': mapSystem.setMode(MapShape.SQUARE); break;
                case '4': mapSystem.setMode(MapShape.CIRCLE); break;
            }
            debugDiv.textContent = `MODE: ${mapSystem.mode}`;
            inputState.debugKey = null;
        }

        sprigSystem.update(inputState);

        // --- GRAPHICS UPDATE (The big v8 change) ---
        pheromonePath.clear();
        
        if (inputState.path.length > 1) {
            // In v8, we define the geometry first...
            pheromonePath.moveTo(inputState.path[0].x, inputState.path[0].y);
            
            for (let i = 1; i < inputState.path.length; i++) {
                pheromonePath.lineTo(inputState.path[i].x, inputState.path[i].y);
            }

            // ...and THEN we command it to stroke (render)
            pheromonePath.stroke({ 
                width: 2, 
                color: 0xffffff, 
                alpha: 0.5 
            });
        }
        
        // --- SCREEN SHAKE UPDATE ---
        // Handle shake input
        if (inputState.pulse) {
            shakeIntensity = CONFIG.SCREEN_SHAKE_INTENSITY;
            // Reset pulse immediately so we don't shake forever if input sticks
            inputState.pulse = null; 
        }

        // Apply shake logic synced to the ticker (smoother than requestAnimationFrame)
        if (shakeIntensity > 0) {
            app.stage.position.set(
                (Math.random() - 0.5) * shakeIntensity,
                (Math.random() - 0.5) * shakeIntensity
            );
            // Decay based on time, not frame rate
            shakeIntensity -= CONFIG.SCREEN_SHAKE_DECAY * ticker.deltaTime;
        } else {
            // Snap back to zero when done
            app.stage.position.set(0, 0);
        }
    });
}

main();