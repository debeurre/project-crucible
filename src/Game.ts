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
import { ItemSystem } from './systems/ItemSystem';
import { InvaderSystem } from './systems/InvaderSystem';
import { ResourceRenderer } from './systems/ResourceRenderer';

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
    private resourceRenderer: ResourceRenderer;
    private floatingTextSystem: FloatingTextSystem;
    private graphSystem: GraphSystem;
    private movementPathSystem: MovementPathSystem;
    private toolOverlaySystem: ToolOverlaySystem;
    private levelManager: LevelManager;
    private itemSystem: ItemSystem;
    private invaderSystem: InvaderSystem;
    
    private toolManager: ToolManager;
    private inputState: InputState;
    private inputController: InputController;
    private debugOverlay: DebugOverlay;
    private toolbar: Toolbar;

    // State
    private score = 0;
    
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
        this.resourceSystem = new ResourceSystem();
        this.resourceRenderer = new ResourceRenderer(app, this.resourceSystem);
        this.graphSystem = new GraphSystem(this.flowFieldSystem);
        this.movementPathSystem = new MovementPathSystem();
        this.toolOverlaySystem = new ToolOverlaySystem();
        this.toolOverlaySystem.container.eventMode = 'none';
        this.itemSystem = new ItemSystem(app);

        // SprigSystem needs MovementPathSystem and ItemSystem
        this.sprigSystem = new SprigSystem(app, this.mapSystem, this.flowFieldSystem, this.movementPathSystem, this.graphSystem, this.resourceSystem, this.itemSystem);
        
        this.invaderSystem = new InvaderSystem(app, this.sprigSystem);

        // Level Manager
        this.levelManager = new LevelManager(this.mapSystem, this.resourceSystem, this.invaderSystem);
        this.levelManager.init().then(() => {
            const defaultLevel = this.levelManager.getDefaultLevelId();
            console.log('Game: Loading default level:', defaultLevel);
            this.loadLevel(defaultLevel);
        });

        // Register Systems
        this.systemManager.addSystem(this.mapSystem);
        this.systemManager.addSystem(this.flowFieldSystem);
        this.systemManager.addSystem(this.resourceSystem);
        this.systemManager.addSystem(this.resourceRenderer);
        this.systemManager.addSystem(this.itemSystem);
        this.systemManager.addSystem(this.graphSystem);
        this.systemManager.addSystem(this.movementPathSystem);
        this.systemManager.addSystem(this.sprigSystem);
        this.systemManager.addSystem(this.invaderSystem);
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
                let levelId = 'room0';
                if (mode === MapShape.ROOM1) levelId = 'room1';
                else if (mode === MapShape.ANT_ROOM) levelId = 'room2';
                
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

        // Temporary Keybinds
        window.addEventListener('keydown', (e) => {
            if (e.key === '2') {
                console.log('Key 2 pressed, loading room2');
                this.loadLevel('room2');
            }
        });
    }

    public async loadLevel(levelId: string) {
        await this.levelManager.loadLevel(levelId);
        
        this.score = 0;
        this.sprigSystem.clearAll();
        this.flowFieldSystem.clearAll();
        this.graphSystem.clearAll();
        this.itemSystem.clearAll();
        this.invaderSystem.setActive(levelId === 'room1');
        this.updateUI();
        
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
        
        // Resources (Structures) - Rendered by ResourceRenderer now
        this.worldContainer.addChild(this.resourceRenderer.container);

        // Items (Ground)
        this.worldContainer.addChild(this.itemSystem.container);

        // Sprigs
        this.worldContainer.addChild(this.sprigSystem.container);
        
        // Flow Field Visualization
        this.worldContainer.addChild(this.flowFieldSystem.container);
        
        // Graph (Nodes/Edges)
        this.worldContainer.addChild(this.graphSystem.container);
        
        // Movement Paths (Over graph, under UI)
        this.worldContainer.addChild(this.movementPathSystem.container);

        // 4. Crucible (On top of map/sprigs)
        // Handled by ResourceSystem (Logic) & ResourceRenderer (View)

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

            // Pickup (DISABLED for Eusocial Update Phase 1)
            // if (!this.sprigSystem.isCarrying(i) && this.resourceSystem.isInside(sprigBounds.x, sprigBounds.y)) {
            //     this.sprigSystem.setCargo(i, 1); 
            // }

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
        // 1. Tap Animation (Priority)
        if (this.tapAnimProgress < 1.0) {
            this.tapAnimProgress += ticker.deltaMS / CONFIG.CASTLE_ANIMATION.TAP_DURATION_MS;
            if (this.tapAnimProgress > 1.0) this.tapAnimProgress = 1.0;
        } 
        // 2. Hold Animation (Rhythmic)
        else if (this.inputController.isCrucibleMode && (performance.now() - this.inputController.lastInputDownTime) >= CONFIG.TAP_THRESHOLD_MS) {
            const phaseInc = (ticker.deltaMS / CONFIG.CASTLE_ANIMATION.HOLD_CYCLE_DURATION_MS) * 2 * Math.PI;
            this.holdAnimPhase += phaseInc;
        }
        else {
             this.holdAnimPhase = 0;
        }
        
        this.resourceRenderer.setAnimationState(this.tapAnimProgress, this.holdAnimPhase);
    }

    private updateUI() {
        this.debugOverlay.update(
            this.score,
            this.sprigSystem.activeSprigCount
        );
    }
}
