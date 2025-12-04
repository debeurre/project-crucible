// src/main.ts
import { Application, Graphics } from 'pixi.js'; // Named imports are better for tree-shaking
import { SprigSystem } from './SprigSystem';
import { createInputManager } from './InputManager';
import { CONFIG } from './config';

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

    const mouseState = createInputManager(app);
    const sprigSystem = new SprigSystem(app);

    // 3. Graphics Setup
    const pheromonePath = new Graphics();
    app.stage.addChild(pheromonePath);

    // 4. The Game Loop (Ticker)
    // v8 passes 'ticker' to the callback which contains deltaTime
    app.ticker.add((ticker) => {
        sprigSystem.update(mouseState);

        // --- GRAPHICS UPDATE (The big v8 change) ---
        pheromonePath.clear();
        
        if (mouseState.path.length > 1) {
            // In v8, we define the geometry first...
            pheromonePath.moveTo(mouseState.path[0].x, mouseState.path[0].y);
            
            for (let i = 1; i < mouseState.path.length; i++) {
                pheromonePath.lineTo(mouseState.path[i].x, mouseState.path[i].y);
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
        if (mouseState.pulse) {
            shakeIntensity = CONFIG.SCREEN_SHAKE_INTENSITY;
            // Reset pulse immediately so we don't shake forever if input sticks
            mouseState.pulse = null; 
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