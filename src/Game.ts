import { Application, Graphics, Container, Ticker, Sprite } from 'pixi.js';
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
import { TextureFactory } from './systems/TextureFactory';

export class Game {
    private app: Application;
    private worldContainer: Container;
    private background: Graphics;
    private crucible: Sprite;
    
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
        const crucibleTex = TextureFactory.getCrucibleTexture(app.renderer);
        this.crucible = new Sprite(crucibleTex);
        this.crucible.anchor.set(0.5);
        this.crucible.tint = CONFIG.CRUCIBLE_COLOR;

        // Initialize Systems
        this.systemManager = new SystemManager();

        this.mapSystem = new MapSystem(app);
        this.visualEffects = new VisualEffects();
        this.flowFieldSystem = new FlowFieldSystem(app);
        this.resourceSystem = new ResourceSystem(app, this.mapSystem);
        this.floatingTextSystem = new FloatingTextSystem();
        this.graphSystem = new GraphSystem(this.flowFieldSystem);
        this.movementPathSystem = new MovementPathSystem();
        this.toolOverlaySystem = new ToolOverlaySystem();
        this.toolOverlaySystem.container.eventMode = 'none';

        // SprigSystem needs MovementPathSystem
        this.sprigSystem = new SprigSystem(app, this.mapSystem, this.flowFieldSystem, this.movementPathSystem);

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
                this.mapSystem.setMode(mode);
                this.resourceSystem.spawnRandomly(); 
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
            this.debugOverlay
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
        this.worldContainer.addChild(this.crucible);

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
        
        this.crucible.x = this.app.screen.width / 2;
        this.crucible.y = this.app.screen.height / 2;
        this.inputController.updateCruciblePosition(this.crucible.x, this.crucible.y);
        
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
                
                // Spawn Floating Text (+1 Pop)
                this.floatingTextSystem.spawn(
                    this.crucible.x, 
                    this.crucible.y, 
                    CONFIG.FLOATING_TEXT.TEXT, 
                    CONFIG.RESOURCE_NODE_COLOR // Use resource color for text
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
            this.tapAnimProgress += ticker.deltaMS / CONFIG.CRUCIBLE_ANIMATION.TAP_DURATION_MS;
            if (this.tapAnimProgress > 1.0) this.tapAnimProgress = 1.0;
            const t = Math.sin(this.tapAnimProgress * Math.PI); 
            scaleX = 1.0 - (t * CONFIG.CRUCIBLE_ANIMATION.TAP_SQUEEZE_FACTOR); 
        } 
        // 2. Hold Animation (Rhythmic)
        else if (this.inputController.isCrucibleMode && (performance.now() - this.inputController.lastInputDownTime) >= CONFIG.TAP_THRESHOLD_MS) {
            const phaseInc = (ticker.deltaMS / CONFIG.CRUCIBLE_ANIMATION.HOLD_CYCLE_DURATION_MS) * 2 * Math.PI;
            this.holdAnimPhase += phaseInc;
            const t = (Math.sin(this.holdAnimPhase) + 1) / 2;
            scaleX = 1.0 - (t * CONFIG.CRUCIBLE_ANIMATION.HOLD_SQUEEZE_FACTOR);
        }
        else {
             this.holdAnimPhase = 0;
        }
        
        const scaleY = 1.0 / Math.max(0.1, scaleX); 
        this.crucible.scale.set(scaleX, scaleY);
    }

    private updateUI() {
        this.debugOverlay.update(
            this.score,
            this.sprigSystem.activeSprigCount
        );
    }
}