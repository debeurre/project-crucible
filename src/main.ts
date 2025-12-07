// src/main.ts
import { Application, Graphics, Container, Point } from 'pixi.js'; // Named imports are better for tree-shaking
import { SprigSystem } from './SprigSystem';
import { createInputManager } from './InputManager';
import { CONFIG } from './config';
import { MapSystem, MapShape } from './systems/MapSystem';
import { VisualEffects } from './systems/VisualEffects';
import { FlowFieldSystem } from './systems/FlowFieldSystem';

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

    // Disable right-click context menu
    document.body.addEventListener('contextmenu', (e) => e.preventDefault());
    
    // Initialize Systems EARLY
    const mapSystem = new MapSystem(app);
    const visualEffects = new VisualEffects();
    const flowFieldSystem = new FlowFieldSystem(app); // New: FlowFieldSystem

    // --- DEBUG UI ---
    const debugContainer = document.createElement('div');
    debugContainer.style.position = 'absolute';
    debugContainer.style.bottom = '20px';
    debugContainer.style.left = '20px';
    debugContainer.style.color = 'white';
    debugContainer.style.fontFamily = 'monospace';
    debugContainer.style.fontSize = '14px'; // Slightly smaller
    debugContainer.style.pointerEvents = 'none';
    debugContainer.style.display = 'flex';
    debugContainer.style.flexDirection = 'column';
    debugContainer.style.gap = '4px';
    debugContainer.style.textShadow = '1px 1px 0 #000';
    document.body.appendChild(debugContainer);

    // Data for UI
    const modes = [
        { key: '1', label: 'FULL', mode: MapShape.FULL },
        { key: '2', label: 'RECT', mode: MapShape.RECT },
        { key: '3', label: 'SQUARE', mode: MapShape.SQUARE },
        { key: '4', label: 'CIRCLE', mode: MapShape.CIRCLE },
        { key: '5', label: 'PROCGEN', mode: MapShape.PROCGEN },
        { key: '6', label: 'MIRROR', mode: MapShape.MIRROR },
        { key: '7', label: 'RADIAL', mode: MapShape.RADIAL },
    ];
    
    const effects = [
        { key: 'Q', label: 'BLUR', getter: () => visualEffects.blurEnabled },
        { key: 'W', label: 'LIQUID', getter: () => visualEffects.thresholdEnabled },
        { key: 'E', label: 'WIGGLE', getter: () => visualEffects.displacementEnabled },
        { key: 'R', label: 'GRAIN', getter: () => visualEffects.noiseEnabled },
    ];

    const modeElements: HTMLDivElement[] = [];
    const effectElements: HTMLDivElement[] = [];

    // Create DOM for Modes
    modes.forEach(m => {
        const line = document.createElement('div');
        line.textContent = `${m.key} - MODE: ${m.label}`;
        debugContainer.appendChild(line);
        modeElements.push(line);
    });
    
    // Spacer
    const spacer = document.createElement('div');
    spacer.style.height = '10px';
    debugContainer.appendChild(spacer);

    // Create DOM for Effects
    effects.forEach(eff => {
        const line = document.createElement('div');
        line.textContent = `${eff.key} - FX: ${eff.label}`;
        debugContainer.appendChild(line);
        effectElements.push(line);
    });

    const updateDebugUI = () => {
        // Update Modes
        modes.forEach((m, i) => {
            if (mapSystem.mode === m.mode) {
                modeElements[i].style.opacity = '1.0';
                modeElements[i].style.color = '#fff';
                modeElements[i].style.fontWeight = 'bold';
            } else {
                modeElements[i].style.opacity = '0.5';
                modeElements[i].style.color = '#aaa';
                modeElements[i].style.fontWeight = 'normal';
            }
        });
        
        // Update Effects
        effects.forEach((eff, i) => {
            if (eff.getter()) {
                effectElements[i].style.opacity = '1.0';
                effectElements[i].style.color = '#8f8'; // Greenish for ON
                effectElements[i].style.fontWeight = 'bold';
            } else {
                effectElements[i].style.opacity = '0.5';
                effectElements[i].style.color = '#aaa';
                effectElements[i].style.fontWeight = 'normal';
            }
        });
    };

    const inputState = createInputManager(app); // Renamed to inputState

    updateDebugUI(); // Initial UI update

    // Background Layer (Separate from WorldContainer to avoid liquid blur)
    const background = new Graphics();
    background.rect(0, 0, app.screen.width, app.screen.height).fill(CONFIG.BG_COLOR);
    app.stage.addChild(background);

    // Create World Container (The "Canvas" for our Living Painting)
    const worldContainer = new Container();
    app.stage.addChild(worldContainer);

    // Add Map to World
    worldContainer.addChild(mapSystem.container);

    // Add Flow Field visuals to World
    worldContainer.addChild(flowFieldSystem.container); // New: FlowField visuals

    // Crucible (Spawn/Sink)
    const crucible = new Graphics();
    crucible.circle(0, 0, CONFIG.CRUCIBLE_RADIUS).fill(CONFIG.CRUCIBLE_COLOR);
    crucible.x = app.screen.width / 2;
    crucible.y = app.screen.height / 2;
    worldContainer.addChild(crucible);

    // Sprigs go into World
    const sprigSystem = new SprigSystem(app, mapSystem, worldContainer, flowFieldSystem);
    
    // Graphics Setup (Pheromone Path)
    const pheromonePath = new Graphics();
    worldContainer.addChild(pheromonePath);

    // Apply Visual Effects (Shader Stack)
    visualEffects.applyTo(worldContainer);

    // Handle resize
    app.renderer.on('resize', () => {
        background.clear();
        background.rect(0, 0, app.screen.width, app.screen.height).fill(CONFIG.BG_COLOR);
        mapSystem.resize();
        flowFieldSystem.resize(); // New: Resize flow field
        crucible.x = app.screen.width / 2; // Recenter crucible
        crucible.y = app.screen.height / 2;
    });

    // Spawning Logic
    let spawnTimer = 0;
    const spawnInterval = 1 / CONFIG.SPRIGS_PER_SECOND_SPAWN; // Time per sprig
    let crucibleScaleY = 1.0; // For visual feedback

    // --- Flow Field Painting State ---
    let lastMousePos: Point | null = null;

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
                case '5': mapSystem.setMode(MapShape.PROCGEN); break;
                case '6': mapSystem.setMode(MapShape.MIRROR); break;
                case '7': mapSystem.setMode(MapShape.RADIAL); break;
                
                // Effects
                case 'Q': visualEffects.toggleBlur(); break;
                case 'W': visualEffects.toggleThreshold(); break;
                case 'E': visualEffects.toggleDisplacement(); break;
                case 'R': visualEffects.toggleNoise(); break;
            }
            updateDebugUI();
            inputState.debugKey = null;
        }

        // --- FLOW FIELD PAINTING ---
        if (inputState.isDown && !inputState.isHolding && !inputState.isDragging && lastMousePos) {
            // New drag for painting flow
            const dragVecX = inputState.mousePosition.x - lastMousePos.x;
            const dragVecY = inputState.mousePosition.y - lastMousePos.y;

            // Only paint if not over crucible (Crucible is not a paintable area)
            const dx = inputState.mousePosition.x - crucible.x;
            const dy = inputState.mousePosition.y - crucible.y;
            const distSq = dx*dx + dy*dy;
            if (distSq > CONFIG.CRUCIBLE_RADIUS**2) { // Only paint if NOT over crucible
                 flowFieldSystem.paintFlow(inputState.mousePosition.x, inputState.mousePosition.y, dragVecX, dragVecY);
            }
        }
        lastMousePos = inputState.mousePosition.clone(); // Store current mouse position for next frame's drag vector

        // --- SPAWNING LOGIC (Tap + Hold) ---
        if (inputState.isHolding) {
            // Check if mouse is over crucible
            const dx = inputState.mousePosition.x - crucible.x;
            const dy = inputState.mousePosition.y - crucible.y;
            const distSq = dx*dx + dy*dy;
            
            if (distSq < CONFIG.CRUCIBLE_RADIUS**2) {
                spawnTimer += ticker.deltaTime / 1000; // Convert to seconds
                
                // Crucible visual squash
                crucibleScaleY = 0.9 + Math.sin(app.ticker.lastTime * 0.01) * 0.05; // Gentle pulsation
                crucible.scale.set(1.0, crucibleScaleY);

                while (spawnTimer >= spawnInterval) {
                    sprigSystem.spawnSprig(crucible.x, crucible.y);
                    spawnTimer -= spawnInterval;
                }
            } else {
                // Not holding over crucible, reset timer and scale
                spawnTimer = 0;
                crucibleScaleY = 1.0;
                crucible.scale.set(1.0, 1.0);
            }
        } else {
            // Not holding, reset timer and scale
            spawnTimer = 0;
            crucibleScaleY = 1.0;
            crucible.scale.set(1.0, 1.0);
        }

        sprigSystem.update(inputState);
        visualEffects.update(ticker);

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