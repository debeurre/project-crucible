import { Application, Graphics, Container, Ticker } from 'pixi.js';
import { SprigSystem } from './SprigSystem';
import { createInputManager, InputState } from './InputManager';
import { CONFIG } from './config';
import { MapSystem } from './systems/MapSystem';
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
import { TraceSystem } from './systems/TraceSystem';

export class Game {
    private app: Application;
    private worldContainer: Container;
    private background: Graphics;
    
    // Systems
    private systemManager: SystemManager;
    private mapSystem: MapSystem;
    private sprigSystem: SprigSystem;
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
    private traceSystem: TraceSystem;
    
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
        this.flowFieldSystem = new FlowFieldSystem(app);
        this.floatingTextSystem = new FloatingTextSystem();
        
        this.resourceSystem = new ResourceSystem();
        this.resourceRenderer = new ResourceRenderer(app, this.resourceSystem);
        
        this.graphSystem = new GraphSystem(this.flowFieldSystem);
        this.movementPathSystem = new MovementPathSystem();
        this.toolOverlaySystem = new ToolOverlaySystem();
        this.toolOverlaySystem.container.eventMode = 'none';
        this.itemSystem = new ItemSystem(app);
        this.traceSystem = new TraceSystem();

        // SprigSystem needs TraceSystem
        this.sprigSystem = new SprigSystem(app, this.mapSystem, this.flowFieldSystem, this.movementPathSystem, this.graphSystem, this.resourceSystem, this.itemSystem, this.traceSystem);
        
        this.invaderSystem = new InvaderSystem(app, this.sprigSystem);

        // Level Manager
        this.levelManager = new LevelManager(this.mapSystem, this.resourceSystem, this.invaderSystem);
        this.levelManager.init().then(() => {
            const defaultLevel = this.levelManager.getDefaultLevelId();
            this.loadLevel(defaultLevel);
        });

        // Register Systems (TraceSystem updated explicitly in loop per instruction)
        this.systemManager.addSystem(this.mapSystem);
        this.systemManager.addSystem(this.flowFieldSystem);
        this.systemManager.addSystem(this.resourceSystem);
        this.systemManager.addSystem(this.resourceRenderer);
        this.systemManager.addSystem(this.itemSystem);
        this.systemManager.addSystem(this.graphSystem);
        this.systemManager.addSystem(this.movementPathSystem);
        this.systemManager.addSystem(this.sprigSystem);
        this.systemManager.addSystem(this.invaderSystem);
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
            this.movementPathSystem, 
            this.toolOverlaySystem,
            this.traceSystem,
            this.itemSystem,
            this.toolbar
        );

        this.inputController = new InputController(
            this.inputState,
            this.toolManager,
            this.sprigSystem,
            this.mapSystem,
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
        
        this.app.renderer.on('resize', this.onResize.bind(this));
        this.onResize(); 

        this.app.ticker.add(this.update.bind(this));
        
        this.updateUI();

        // Temporary Keybinds
        window.addEventListener('keydown', (e) => {
            if (e.key === '2') {
                this.loadLevel('room2');
            }
            if (e.key.toLowerCase() === 'c') {
                this.itemSystem.spawnRandomCrumbs(20, 800, 400, 200);
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
        this.traceSystem.clearAll();
        this.invaderSystem.setActive(levelId === 'room1');
        this.toolbar.setMapMode(this.mapSystem.getMode());
        this.updateUI();
        
        // Spawn initial sprigs
        if (levelId === 'room1' || levelId === 'room2') {
            const castlePos = this.resourceSystem.getCastlePosition();
            const count = levelId === 'room2' ? 10 : 6;
            for(let i=0; i<count; i++) {
                this.sprigSystem.spawnSprig(castlePos.x, castlePos.y, 0);
            }
        }
    }

    private setupWorld() {
        this.app.stage.addChild(this.background);
        this.app.stage.addChild(this.worldContainer);
        
        // Layers
        this.worldContainer.addChild(this.mapSystem.container);
        this.worldContainer.addChild(this.traceSystem.container); // Below Sprigs
        this.worldContainer.addChild(this.resourceRenderer.container);
        this.worldContainer.addChild(this.itemSystem.container);
        this.worldContainer.addChild(this.sprigSystem.container);
        this.worldContainer.addChild(this.flowFieldSystem.container);
        this.worldContainer.addChild(this.graphSystem.container);
        this.worldContainer.addChild(this.movementPathSystem.container);
        this.worldContainer.addChild(this.floatingTextSystem.container);
        
        this.app.stage.addChild(this.toolbar);
        this.app.stage.addChild(this.toolOverlaySystem.container);
    }

    private onResize() {
        this.background.clear();
        this.background.rect(0, 0, this.app.screen.width, this.app.screen.height).fill(CONFIG.BG_COLOR);
        
        this.systemManager.resize(this.app.screen.width, this.app.screen.height);
        this.toolbar.resize(this.app.screen.width, this.app.screen.height);
    }

    private update(ticker: Ticker) {
        this.inputController.update(ticker);
        
        this.traceSystem.update(ticker); // Explicit update per instruction
        this.updateGameLogic(ticker);
        this.renderVisuals(ticker);
        this.toolManager.update(ticker);
        
        this.cleanupPaths();
    }

    private cleanupPaths() {
        const activePathIds = this.sprigSystem.getActivePathIds();
        const allPathIds = this.movementPathSystem.getAllPathIds();
        
        for (const id of allPathIds) {
            if (!activePathIds.has(id)) {
                this.movementPathSystem.removePath(id);
            }
        }
    }

    private updateGameLogic(ticker: Ticker) {
        for (let i = 0; i < this.sprigSystem.activeSprigCount; i++) {
            if (!this.sprigSystem.isSprigActive(i)) continue;
            if (!this.sprigSystem.isPlayer(i)) continue;

            const sprigBounds = this.sprigSystem.getSprigBounds(i);

            if (this.sprigSystem.isCarrying(i) && this.resourceSystem.isInsideCastle(sprigBounds.x, sprigBounds.y)) {
                this.sprigSystem.setCargo(i, 0);
                this.score++;
                this.resourceSystem.feedCastle(10);
                this.updateUI();
                
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
        
        const mx = this.inputState.mousePosition.x;
        const my = this.inputState.mousePosition.y;
        this.toolManager.renderCursor(this.toolOverlaySystem.graphics, mx, my);
    }

    private updateCrucibleAnimation(ticker: Ticker) {
        if (this.tapAnimProgress < 1.0) {
            this.tapAnimProgress += ticker.deltaMS / CONFIG.CASTLE_ANIMATION.TAP_DURATION_MS;
            if (this.tapAnimProgress > 1.0) this.tapAnimProgress = 1.0;
        } 
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