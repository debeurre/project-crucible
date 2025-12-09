import { Application, Graphics, Container, Point, Ticker } from 'pixi.js';
import { SprigSystem } from './SprigSystem';
import { createInputManager, InputState } from './InputManager';
import { CONFIG } from './config';
import { MapSystem, MapShape } from './systems/MapSystem';
import { VisualEffects } from './systems/VisualEffects';
import { FlowFieldSystem } from './systems/FlowFieldSystem';
import { ResourceSystem } from './systems/ResourceSystem';
import { DebugOverlay } from './ui/DebugOverlay';

export class Game {
    private app: Application;
    private worldContainer: Container;
    private background: Graphics;
    private crucible: Graphics;
    
    // Systems
    private mapSystem: MapSystem;
    private sprigSystem: SprigSystem;
    private visualEffects: VisualEffects;
    private flowFieldSystem: FlowFieldSystem;
    private resourceSystem: ResourceSystem;
    private inputState: InputState;
    private debugOverlay: DebugOverlay;

    // State
    private score = 0;
    private spawnTimer = 0;
    private crucibleScaleY = 1.0;
    private lastMousePos: Point | null = null;

    constructor(app: Application) {
        this.app = app;
        this.inputState = createInputManager(app);
        this.debugOverlay = new DebugOverlay();
        
        // Initialize Systems
        this.mapSystem = new MapSystem(app);
        this.visualEffects = new VisualEffects();
        this.flowFieldSystem = new FlowFieldSystem(app);
        this.resourceSystem = new ResourceSystem(app);

        // Initialize Visual Containers
        this.background = new Graphics();
        this.worldContainer = new Container();
        this.crucible = new Graphics();
        
        this.setupWorld();
        
        // Sprig System (needs world container)
        this.sprigSystem = new SprigSystem(app, this.mapSystem, this.worldContainer, this.flowFieldSystem);
        
        // Setup Resize Handler
        this.app.renderer.on('resize', this.onResize.bind(this));
        this.onResize(); // Initial sizing

        // Start Game Loop
        this.app.ticker.add(this.update.bind(this));
        
        // Initial UI Update
        this.updateUI();
    }

    private setupWorld() {
        // 1. Background (Separate layer)
        this.app.stage.addChild(this.background);
        
        // 2. World Container
        this.app.stage.addChild(this.worldContainer);
        
        // 3. Layers in World
        this.worldContainer.addChild(this.mapSystem.container);
        this.worldContainer.addChild(this.flowFieldSystem.container);
        this.worldContainer.addChild(this.resourceSystem.container);
        
        // 4. Crucible
        this.crucible.circle(0, 0, CONFIG.CRUCIBLE_RADIUS).fill(CONFIG.CRUCIBLE_COLOR);
        this.worldContainer.addChild(this.crucible);
        
        // 6. Apply Effects
        this.visualEffects.applyTo(this.worldContainer);
    }

    private onResize() {
        this.background.clear();
        this.background.rect(0, 0, this.app.screen.width, this.app.screen.height).fill(CONFIG.BG_COLOR);
        
        this.mapSystem.resize();
        this.flowFieldSystem.resize();
        this.resourceSystem.resize();
        
        this.crucible.x = this.app.screen.width / 2;
        this.crucible.y = this.app.screen.height / 2;
    }

    private update(ticker: Ticker) {
        this.handleInput(ticker);
        this.updateGameLogic(ticker);
        this.renderVisuals();
    }

    private handleInput(ticker: Ticker) {
        // Debug Input
        if (this.inputState.debugKey) {
            const k = this.inputState.debugKey;
            switch (k) {
                case '1': this.mapSystem.setMode(MapShape.FULL); break;
                case '2': this.mapSystem.setMode(MapShape.RECT); break;
                case '3': this.mapSystem.setMode(MapShape.SQUARE); break;
                case '4': this.mapSystem.setMode(MapShape.CIRCLE); break;
                case '5': this.mapSystem.setMode(MapShape.PROCGEN); break;
                case '6': this.mapSystem.setMode(MapShape.MIRROR); break;
                case '7': this.mapSystem.setMode(MapShape.RADIAL); break;
                
                case 'Q': this.visualEffects.toggleBlur(); break;
                case 'W': this.visualEffects.toggleThreshold(); break;
                case 'E': this.visualEffects.toggleDisplacement(); break;
                case 'R': this.visualEffects.toggleNoise(); break;

                case 'F': this.flowFieldSystem.clearAll(); break;
                case 'S': this.sprigSystem.clearAll(); break;
            }
            this.updateUI();
            this.inputState.debugKey = null;
        }

        // Main Interaction Logic
        if (this.inputState.isDown) {
            const dx = this.inputState.mousePosition.x - this.crucible.x;
            const dy = this.inputState.mousePosition.y - this.crucible.y;
            const distSq = dx*dx + dy*dy;
            
            // Interaction Zone Logic
            if (distSq < CONFIG.CRUCIBLE_RADIUS**2) {
                // --- ZONE: CRUCIBLE (SPAWNING) ---
                this.spawnTimer += ticker.deltaMS / 1000;
                
                // Visual Squash
                this.crucibleScaleY = 0.9 + Math.sin(this.app.ticker.lastTime * 0.01) * 0.05;
                this.crucible.scale.set(1.0, this.crucibleScaleY);

                const spawnInterval = 1 / CONFIG.SPRIGS_PER_SECOND_SPAWN;
                while (this.spawnTimer >= spawnInterval) {
                    this.sprigSystem.spawnSprig(this.crucible.x, this.crucible.y);
                    this.spawnTimer -= spawnInterval;
                    this.updateUI(); // Update UI to show new sprig count
                }
            } else {
                // --- ZONE: WORLD (FLOW FIELD) ---
                this.resetSpawnState(); // Stop spawning if we drift out

                const dragVecX = this.inputState.mousePosition.x - (this.lastMousePos?.x ?? this.inputState.mousePosition.x);
                const dragVecY = this.inputState.mousePosition.y - (this.lastMousePos?.y ?? this.inputState.mousePosition.y);

                if (dragVecX !== 0 || dragVecY !== 0) {
                     this.flowFieldSystem.paintFlow(this.inputState.mousePosition.x, this.inputState.mousePosition.y, dragVecX, dragVecY);
                }
            }
        } else {
            // Mouse Up / No Input
            this.resetSpawnState();
        }
        
        // Update history
        this.lastMousePos = this.inputState.mousePosition.clone();
    }

    private resetSpawnState() {
        this.spawnTimer = 0;
        this.crucibleScaleY = 1.0;
        this.crucible.scale.set(1.0, 1.0);
    }

    private updateGameLogic(ticker: Ticker) {
        // Check Sprig Interactions
        for (let i = 0; i < this.sprigSystem.activeSprigCount; i++) {
            if (!this.sprigSystem.isSprigActive(i)) continue;

            const sprigBounds = this.sprigSystem.getSprigBounds(i);

            // Pickup
            if (!this.sprigSystem.isCarrying(i) && this.resourceSystem.isInside(sprigBounds.x, sprigBounds.y)) {
                this.sprigSystem.setCargo(i, 1); 
            }

            // Dropoff
            const dx = sprigBounds.x - this.crucible.x;
            const dy = sprigBounds.y - this.crucible.y;
            const distSq = dx*dx + dy*dy;
            
            if (this.sprigSystem.isCarrying(i) && distSq < (CONFIG.CRUCIBLE_RADIUS + sprigBounds.radius)**2) {
                this.sprigSystem.setCargo(i, 0);
                this.score++;
                this.updateUI();

                // Feedback
                this.crucible.scale.set(1.1, 0.9);
                setTimeout(() => this.crucible.scale.set(1.0, 1.0), 100);
            }
        }

        this.sprigSystem.update(ticker);
        this.visualEffects.update(ticker);
    }

    private renderVisuals() {
        // Placeholder for future visuals
    }

    private updateUI() {
        this.debugOverlay.update(
            this.score,
            this.sprigSystem.activeSprigCount, 
            this.mapSystem.mode,
            {
                blur: this.visualEffects.blurEnabled,
                threshold: this.visualEffects.thresholdEnabled,
                displacement: this.visualEffects.displacementEnabled,
                noise: this.visualEffects.noiseEnabled
            }
        );
    }
}