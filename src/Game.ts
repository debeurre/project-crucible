import { Application, Graphics, Container, Ticker } from 'pixi.js';
import { SprigSystem } from './SprigSystem';
import { createInputManager, InputState } from './InputManager';
import { CONFIG } from './config';
import { MapSystem } from './systems/MapSystem';
import { VisualEffects } from './systems/VisualEffects';
import { FlowFieldSystem } from './systems/FlowFieldSystem';
import { ResourceSystem } from './systems/ResourceSystem';
import { FloatingTextSystem } from './systems/FloatingTextSystem';
import { GraphSystem } from './systems/GraphSystem';
import { MovementPathSystem } from './systems/MovementPathSystem';
import { SystemManager } from './systems/SystemManager';
import { ToolOverlaySystem } from './systems/ToolOverlaySystem';
import { InputController } from './InputController';
import { DebugOverlay } from './ui/DebugOverlay';
import { Toolbar } from './ui/Toolbar';
import { ToolManager } from './tools/ToolManager';
import { LevelManager } from './systems/LevelManager';
import { MapShape } from './types/MapTypes';

export class Game {
    private app: Application;
    private worldContainer: Container;
    private background: Graphics;
    
    // Systems
    private systemManager: SystemManager;
    private mapSystem: MapSystem;
    private sprigSystem: SprigSystem;
    private visualEffects: VisualEffects;
    private flowFieldSystem: FlowFieldSystem;
    private resourceSystem: ResourceSystem;
    private floatingTextSystem: FloatingTextSystem;
    private graphSystem: GraphSystem;
    private movementPathSystem: MovementPathSystem;
    private toolOverlaySystem: ToolOverlaySystem;
    private levelManager: LevelManager;
    
    private toolManager: ToolManager;
    private inputState: InputState;
    private inputController: InputController;
    private debugOverlay: DebugOverlay;
    private toolbar: Toolbar;

    // State
    private score = 0;
    private invaderTimer = 0;
    
    // Animation State
    private tapAnimProgress = 1.0;
    private holdAnimPhase = 0;
    
    constructor(app: Application) {
        this.app = app;
        this.inputState = createInputManager(app);
        this.debugOverlay = new DebugOverlay();
        
        // Initialize Visual Containers
        this.background = new Graphics();
        this.worldContainer = new Container();

        // Initialize Systems
        this.systemManager = new SystemManager();

        this.mapSystem = new MapSystem(app);
        this.visualEffects = new VisualEffects();
        this.flowFieldSystem = new FlowFieldSystem(app);
        this.floatingTextSystem = new FloatingTextSystem();
        this.resourceSystem = new ResourceSystem(app, this.mapSystem);
        this.graphSystem = new GraphSystem(this.flowFieldSystem);
        this.movementPathSystem = new MovementPathSystem();
        this.toolOverlaySystem = new ToolOverlaySystem();
        this.toolOverlaySystem.container.eventMode = 'none';

        // SprigSystem needs MovementPathSystem
        this.sprigSystem = new SprigSystem(app, this.mapSystem, this.flowFieldSystem, this.movementPathSystem, this.graphSystem, this.resourceSystem);

        // Level Manager
        this.levelManager = new LevelManager(this.mapSystem, this.resourceSystem);
        this.levelManager.init().then(() => {
            this.loadLevel('room0');
        });

        // Register Systems
        this.systemManager.addSystem(this.mapSystem);
        this.systemManager.addSystem(this.flowFieldSystem);
        this.systemManager.addSystem(this.resourceSystem);
        this.systemManager.addSystem(this.graphSystem);
        this.systemManager.addSystem(this.movementPathSystem);
        this.systemManager.addSystem(this.sprigSystem);
        this.systemManager.addSystem(this.visualEffects);
        this.systemManager.addSystem(this.floatingTextSystem);
        this.systemManager.addSystem(this.toolOverlaySystem);

        // Initialize UI
        this.toolbar = new Toolbar(
            (tool) => {
                this.toolManager.setTool(tool);
            },
            (intent) => {
                this.toolManager.setActiveIntent(intent);
            },
            (mode) => {
                const levelId = mode === MapShape.ROOM1 ? 'room1' : 'room0';
                this.loadLevel(levelId);
                this.toolbar.setMapMode(mode);
            }
        );
        
        // Initialize Tool Manager
        this.toolManager = new ToolManager(
            this.graphSystem,
            this.flowFieldSystem,
            this.sprigSystem,
            this.movementPathSystem, // Added
            this.toolOverlaySystem,
            this.toolbar
        );

        this.inputController = new InputController(
            this.inputState,
            this.toolManager,
            this.sprigSystem,
            this.mapSystem,
            this.visualEffects,
            this.flowFieldSystem,
            this.graphSystem,
            this.debugOverlay,
            this.resourceSystem
        );

        this.inputController.onCrucibleTap = () => {
             this.tapAnimProgress = 0;
             this.updateUI();
        };

        this.inputController.onUIUpdate = () => {
            this.updateUI();
        };

        this.setupWorld();
        
        // Setup Resize Handler
        this.app.renderer.on('resize', this.onResize.bind(this));
        this.onResize(); // Initial sizing

        // Start Game Loop
        this.app.ticker.add(this.update.bind(this));
        
        // Initial UI Update
        this.updateUI();
    }

    public async loadLevel(levelId: string) {
        await this.levelManager.loadLevel(levelId);
        
        this.sprigSystem.clearAll();
        this.flowFieldSystem.clearAll();
        this.graphSystem.clearAll();
        
        // Spawn initial sprigs for room1
        if (levelId === 'room1') {
            const castlePos = this.resourceSystem.getCastlePosition();
            for(let i=0; i<6; i++) {
                this.sprigSystem.spawnSprig(castlePos.x, castlePos.y, 0);
            }
        }
    }

    private setupWorld() {
        // 1. Background (Separate layer)
        this.app.stage.addChild(this.background);
        
        // 2. World Container
        this.app.stage.addChild(this.worldContainer);
        
        // 3. Layers in World (Order Matters!)
        // Map (Bottom)
        this.worldContainer.addChild(this.mapSystem.container);
        
        // Sprigs
        this.worldContainer.addChild(this.sprigSystem.container);
        
        // Resources
        this.worldContainer.addChild(this.resourceSystem.container);
        
        // Flow Field Visualization
        this.worldContainer.addChild(this.flowFieldSystem.container);
        
        // Graph (Nodes/Edges)
        this.worldContainer.addChild(this.graphSystem.container);
        
        // Movement Paths (Over graph, under UI)
        this.worldContainer.addChild(this.movementPathSystem.container);

        // 4. Crucible (On top of map/sprigs)
        // Handled by ResourceSystem

        // 5. Floating Text (Always on top)
        this.worldContainer.addChild(this.floatingTextSystem.container);
        
        // 6. UI (Overlay)
        this.app.stage.addChild(this.toolbar);
        this.app.stage.addChild(this.toolOverlaySystem.container);
        
        // 7. Apply Effects
        this.visualEffects.applyTo(this.worldContainer);
    }

    private onResize() {
        this.background.clear();
        this.background.rect(0, 0, this.app.screen.width, this.app.screen.height).fill(CONFIG.BG_COLOR);
        
        this.systemManager.resize(this.app.screen.width, this.app.screen.height);
        
        // const heartPos = this.resourceSystem.getCastlePosition();
        // this.inputController.updateCruciblePosition(heartPos.x, heartPos.y);
        // InputController now queries ResourceSystem directly
        
        this.toolbar.resize(this.app.screen.width, this.app.screen.height);
    }

    private update(ticker: Ticker) {
        this.inputController.update(ticker);
        
        // Invader Spawner
        this.invaderTimer += ticker.deltaMS / 1000;
        if (this.invaderTimer >= 15) {
            this.invaderTimer = 0;
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.max(this.app.screen.width, this.app.screen.height) * 0.6;
            const gx = this.app.screen.width/2 + Math.cos(angle) * dist;
            const gy = this.app.screen.height/2 + Math.sin(angle) * dist;
            this.sprigSystem.spawnSprig(gx, gy, 1);
        }

        this.updateGameLogic(ticker);
        this.renderVisuals(ticker);
        this.toolManager.update(ticker);
        
        // Garbage collect unused paths
        this.cleanupPaths();
    }

    private cleanupPaths() {
        const activePathIds = this.sprigSystem.getActivePathIds();
        const allPathIds = this.movementPathSystem.getAllPathIds();
        
        for (const id of allPathIds) {
            if (!activePathIds.has(id)) {
                // Path is empty of units -> destroy it
                this.movementPathSystem.removePath(id);
            }
        }
    }

    private updateGameLogic(ticker: Ticker) {
        // Check Sprig Interactions
        for (let i = 0; i < this.sprigSystem.activeSprigCount; i++) {
            if (!this.sprigSystem.isSprigActive(i)) continue;
            if (!this.sprigSystem.isPlayer(i)) continue; // Skip invaders

            const sprigBounds = this.sprigSystem.getSprigBounds(i);

            // Pickup
            if (!this.sprigSystem.isCarrying(i) && this.resourceSystem.isInside(sprigBounds.x, sprigBounds.y)) {
                this.sprigSystem.setCargo(i, 1); 
            }

            // Dropoff
            if (this.sprigSystem.isCarrying(i) && this.resourceSystem.isInsideCastle(sprigBounds.x, sprigBounds.y)) {
                this.sprigSystem.setCargo(i, 0);
                this.score++;
                this.resourceSystem.feedCastle(10);
                this.updateUI();
                
                // Spawn Floating Text (+1 Pop)
                const heartPos = this.resourceSystem.getCastlePosition();
                this.floatingTextSystem.spawn(
                    heartPos.x, 
                    heartPos.y, 
                    CONFIG.FLOATING_TEXT.TEXT, 
                    CONFIG.RESOURCE_NODE_COLOR 
                );
            }
        }

        this.systemManager.update(ticker);
    }

    private renderVisuals(ticker: Ticker) {
        this.updateCrucibleAnimation(ticker);
        
        // Render Cursor
        // Only draw if within bounds? Pixi handles off-screen.
        // Get mouse pos
        const mx = this.inputState.mousePosition.x;
        const my = this.inputState.mousePosition.y;
        this.toolManager.renderCursor(this.toolOverlaySystem.graphics, mx, my);
    }

    private updateCrucibleAnimation(ticker: Ticker) {
        let scaleX = 1.0;

        // 1. Tap Animation (Priority)
        if (this.tapAnimProgress < 1.0) {
            this.tapAnimProgress += ticker.deltaMS / CONFIG.CASTLE_ANIMATION.TAP_DURATION_MS;
            if (this.tapAnimProgress > 1.0) this.tapAnimProgress = 1.0;
            const t = Math.sin(this.tapAnimProgress * Math.PI); 
            scaleX = 1.0 - (t * CONFIG.CASTLE_ANIMATION.TAP_SQUEEZE_FACTOR); 
        } 
        // 2. Hold Animation (Rhythmic)
        else if (this.inputController.isCrucibleMode && (performance.now() - this.inputController.lastInputDownTime) >= CONFIG.TAP_THRESHOLD_MS) {
            const phaseInc = (ticker.deltaMS / CONFIG.CASTLE_ANIMATION.HOLD_CYCLE_DURATION_MS) * 2 * Math.PI;
            this.holdAnimPhase += phaseInc;
            const t = (Math.sin(this.holdAnimPhase) + 1) / 2;
            scaleX = 1.0 - (t * CONFIG.CASTLE_ANIMATION.HOLD_SQUEEZE_FACTOR);
        }
        else {
             this.holdAnimPhase = 0;
        }
        
        const scaleY = 1.0 / Math.max(0.1, scaleX); 
        if (this.resourceSystem.castleSprite && this.resourceSystem.getSinkType() === 'CRUCIBLE') {
            this.resourceSystem.castleSprite.scale.set(scaleX, scaleY);
        }
    }

    private updateUI() {
        this.debugOverlay.update(
            this.score,
            this.sprigSystem.activeSprigCount
        );
    }
}
