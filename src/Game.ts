import { Application, Graphics, Container, Point, Ticker } from 'pixi.js';
import { SprigSystem } from './SprigSystem';
import { createInputManager, InputState } from './InputManager';
import { CONFIG } from './config';
import { MapSystem, MapShape } from './systems/MapSystem';
import { VisualEffects } from './systems/VisualEffects';
import { FlowFieldSystem } from './systems/FlowFieldSystem';
import { ResourceSystem } from './systems/ResourceSystem';
import { FloatingTextSystem } from './systems/FloatingTextSystem';
import { GraphSystem } from './systems/GraphSystem';
import { DebugOverlay } from './ui/DebugOverlay';
import { Toolbar, ToolMode } from './ui/Toolbar';
import { TaskIntent } from './types/GraphTypes';

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
    private floatingTextSystem: FloatingTextSystem;
    private graphSystem: GraphSystem;
    
    private inputState: InputState;
    private debugOverlay: DebugOverlay;
    private toolbar: Toolbar;

    // State
    private score = 0;
    private spawnTimer = 0;
    private lastMousePos: Point | null = null;
    
    // Tool State
    private toolMode: ToolMode = 'PENCIL';
    private dragStartNodeId: number | null = null;
    
    // Animation State
    private tapAnimProgress = 1.0;
    private holdAnimPhase = 0;
    
    // Input Logic State
    private wasDown = false;
    private inputDownTime = 0;
    private interactionMode: 'NONE' | 'CRUCIBLE' | 'FLOW' | 'PEN' | 'ERASER' = 'NONE';

    constructor(app: Application) {
        this.app = app;
        this.inputState = createInputManager(app);
        this.debugOverlay = new DebugOverlay();
        
        // Initialize UI
        this.toolbar = new Toolbar((tool) => {
            this.toolMode = tool;
            this.toolbar.setTool(tool);
        });
        
        // Initialize Systems
        this.mapSystem = new MapSystem(app);
        this.visualEffects = new VisualEffects();
        this.flowFieldSystem = new FlowFieldSystem(app);
        this.resourceSystem = new ResourceSystem(app, this.mapSystem);
        this.floatingTextSystem = new FloatingTextSystem();

        // Initialize Visual Containers
        this.background = new Graphics();
        this.worldContainer = new Container();
        this.crucible = new Graphics();
        
        this.setupWorld();
        
        // Systems dependent on world container
        this.graphSystem = new GraphSystem(this.worldContainer, this.flowFieldSystem);
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
        // Graph system adds its own graphics to worldContainer in constructor
        
        // 4. Crucible
        this.crucible.circle(0, 0, CONFIG.CRUCIBLE_RADIUS).fill(CONFIG.CRUCIBLE_COLOR);
        this.worldContainer.addChild(this.crucible);

        // 5. Floating Text (Always on top)
        this.worldContainer.addChild(this.floatingTextSystem.container);
        
        // 6. UI (Overlay)
        this.app.stage.addChild(this.toolbar);
        
        // 7. Apply Effects
        this.visualEffects.applyTo(this.worldContainer);
    }

    private onResize() {
        this.background.clear();
        this.background.rect(0, 0, this.app.screen.width, this.app.screen.height).fill(CONFIG.BG_COLOR);
        
        this.mapSystem.resize();
        this.flowFieldSystem.resize();
        this.resourceSystem.resize();
        this.sprigSystem.resize();
        
        this.crucible.x = this.app.screen.width / 2;
        this.crucible.y = this.app.screen.height / 2;
        
        this.toolbar.resize(this.app.screen.width, this.app.screen.height);
    }

    private update(ticker: Ticker) {
        this.handleInput(ticker);
        this.updateGameLogic(ticker);
        this.renderVisuals(ticker);
    }

    private handleInput(ticker: Ticker) {
        // Debug Input
        if (this.inputState.debugKey) {
            const k = this.inputState.debugKey;
            switch (k) {
                case '1': this.mapSystem.setMode(MapShape.FULL); this.resourceSystem.spawnRandomly(); break;
                case '2': this.mapSystem.setMode(MapShape.RECT); this.resourceSystem.spawnRandomly(); break;
                case '3': this.mapSystem.setMode(MapShape.SQUARE); this.resourceSystem.spawnRandomly(); break;
                case '4': this.mapSystem.setMode(MapShape.CIRCLE); this.resourceSystem.spawnRandomly(); break;
                case '5': this.mapSystem.setMode(MapShape.PROCGEN); this.resourceSystem.spawnRandomly(); break;
                case '6': this.mapSystem.setMode(MapShape.MIRROR); this.resourceSystem.spawnRandomly(); break;
                case '7': this.mapSystem.setMode(MapShape.RADIAL); this.resourceSystem.spawnRandomly(); break;
                
                case 'Q': this.visualEffects.toggleBlur(); break;
                case 'W': this.visualEffects.toggleThreshold(); break;
                case 'E': this.visualEffects.toggleDisplacement(); break;
                case 'R': this.visualEffects.toggleNoise(); break;
                
                case 'G': this.flowFieldSystem.toggleGrid(); break;
                case 'T': 
                    this.toolMode = this.toolMode === 'PENCIL' ? 'PEN' : 'PENCIL'; 
                    this.toolbar.setTool(this.toolMode);
                    break;

                case 'F': this.flowFieldSystem.clearAll(); break;
                case 'S': this.sprigSystem.clearAll(); break;
            }
            this.updateUI();
            this.inputState.debugKey = null;
        }

        const isDown = this.inputState.isDown;
        const now = performance.now();
        const mx = this.inputState.mousePosition.x;
        const my = this.inputState.mousePosition.y;

        // 1. Just Pressed
        if (isDown && !this.wasDown) {
            this.inputDownTime = now;
            
            // Interaction Mode Logic
            const dx = mx - this.crucible.x;
            const dy = my - this.crucible.y;
            const distSq = dx*dx + dy*dy;

            if (distSq < CONFIG.CRUCIBLE_RADIUS**2) {
                this.interactionMode = 'CRUCIBLE';
            } else if (this.toolMode === 'PEN') {
                this.interactionMode = 'PEN';
                const clickedNode = this.graphSystem.getNodeAt(mx, my);
                if (clickedNode) {
                    this.dragStartNodeId = clickedNode.id;
                } else {
                    this.dragStartNodeId = null; 
                }
            } else if (this.toolMode === 'ERASER') {
                this.interactionMode = 'ERASER';
                // Immediate erasure on click
                this.performErasure(mx, my);
            } else {
                this.interactionMode = 'FLOW';
            }
        }

        // 2. Holding
        if (isDown) {
            if (this.interactionMode === 'CRUCIBLE') {
                const holdDuration = now - this.inputDownTime;
                
                if (holdDuration >= CONFIG.TAP_THRESHOLD_MS) {
                    // HOLD ACTION: Continuous Spawn
                    this.spawnTimer += ticker.deltaMS / 1000;
                    
                    const spawnInterval = 1 / CONFIG.SPRIGS_PER_SECOND_HELD;
                    while (this.spawnTimer >= spawnInterval) {
                        this.sprigSystem.spawnSprig(this.crucible.x, this.crucible.y);
                        this.spawnTimer -= spawnInterval;
                        this.updateUI();
                    }
                }
            } else if (this.interactionMode === 'FLOW') {
                // DRAG ACTION: Flow Field (Manual)
                const dragVecX = mx - (this.lastMousePos?.x ?? mx);
                const dragVecY = my - (this.lastMousePos?.y ?? my);

                if (dragVecX !== 0 || dragVecY !== 0) {
                     this.flowFieldSystem.paintManualFlow(mx, my, dragVecX, dragVecY);
                }
            } else if (this.interactionMode === 'ERASER') {
                // Drag Eraser
                this.performErasure(mx, my);
            }
        }

        // 3. Just Released
        if (!isDown && this.wasDown) {
            if (this.interactionMode === 'CRUCIBLE') {
                const holdDuration = now - this.inputDownTime;
                if (holdDuration < CONFIG.TAP_THRESHOLD_MS) {
                    // TAP ACTION: Burst Spawn
                    for(let i=0; i<CONFIG.SPRIGS_PER_TAP; i++) {
                         this.sprigSystem.spawnSprig(this.crucible.x, this.crucible.y);
                    }
                    this.updateUI();
                    
                    // Restart Tap Animation
                    this.tapAnimProgress = 0;
                }
            } else if (this.interactionMode === 'PEN') {
                const endNode = this.graphSystem.getNodeAt(mx, my);
                
                if (this.dragStartNodeId !== null) {
                    // Started on a node
                    if (endNode && endNode.id !== this.dragStartNodeId) {
                        // Dragged from Node A to Node B -> Connect
                        this.graphSystem.createLink(this.dragStartNodeId, endNode.id, TaskIntent.RED_ATTACK);
                    } else if (!endNode) {
                        // Dragged from Node A to Empty -> Create B + Connect
                        const newNode = this.graphSystem.addNode(mx, my);
                        this.graphSystem.createLink(this.dragStartNodeId, newNode.id, TaskIntent.RED_ATTACK);
                    }
                } else {
                    // Started on empty space
                    if (!endNode) {
                        // Clicked/Dragged empty to empty -> Just create Node at end pos
                        // (Simple placement)
                        this.graphSystem.addNode(mx, my);
                    }
                }
                this.dragStartNodeId = null;
            }
            
            // Reset
            this.interactionMode = 'NONE';
            this.spawnTimer = 0;
        }

        this.wasDown = isDown;
        this.lastMousePos = this.inputState.mousePosition.clone();
    }

    private performErasure(x: number, y: number) {
        const radius = 40; // Eraser radius
        
        // 1. Clear Flow
        // We use clearFlow which currently has hardcoded small radius (2 cells).
        // Let's rely on FlowFieldSystem to handle its own radius or update it?
        // Actually, let's just loop a bit here or update FlowFieldSystem later to take radius.
        // For now, call clearFlow multiple times? No, that's inefficient.
        // Let's assume clearFlow does 2 cells (40px) which matches our eraser visual roughly.
        this.flowFieldSystem.clearFlow(x, y); 

        // 2. Remove Graph Elements
        this.graphSystem.removeElementsAt(x, y, radius);

        // 3. Remove Sprigs
        this.sprigSystem.removeSprigsAt(x, y, radius);
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

        this.sprigSystem.update(ticker);
        this.visualEffects.update(ticker);
    }

    private renderVisuals(ticker: Ticker) {
        // We pass ticker here now
        this.updateCrucibleAnimation(ticker);
    }

    private updateCrucibleAnimation(ticker: Ticker) {
        let scaleX = 1.0;

        // 1. Tap Animation (Priority)
        if (this.tapAnimProgress < 1.0) {
            // Progress = Time / Duration
            this.tapAnimProgress += ticker.deltaMS / CONFIG.CRUCIBLE_ANIMATION.TAP_DURATION_MS;
            if (this.tapAnimProgress > 1.0) this.tapAnimProgress = 1.0;

            // Sine hump: 0 -> 1 -> 0
            const t = Math.sin(this.tapAnimProgress * Math.PI); 
            // Squeeze
            scaleX = 1.0 - (t * CONFIG.CRUCIBLE_ANIMATION.TAP_SQUEEZE_FACTOR); 
        } 
        // 2. Hold Animation (Rhythmic)
        else if (this.interactionMode === 'CRUCIBLE' && (performance.now() - this.inputDownTime) >= CONFIG.TAP_THRESHOLD_MS) {
            // Phase increment = (dt / cycle_duration) * 2PI
            const phaseInc = (ticker.deltaMS / CONFIG.CRUCIBLE_ANIMATION.HOLD_CYCLE_DURATION_MS) * 2 * Math.PI;
            this.holdAnimPhase += phaseInc;
            
            // Sine wave 0..1
            const t = (Math.sin(this.holdAnimPhase) + 1) / 2;
            // Squeeze
            scaleX = 1.0 - (t * CONFIG.CRUCIBLE_ANIMATION.HOLD_SQUEEZE_FACTOR);
        }
        // 3. Idle / Recovery
        else {
             this.holdAnimPhase = 0;
        }
        
        // Apply Volume-Preserving Stretch
        // If scaleX decreases (squeeze), scaleY increases (stretch)
        const scaleY = 1.0 / Math.max(0.1, scaleX); 
        
        this.crucible.scale.set(scaleX, scaleY);
    }

    private updateUI() {
        // We could extend DebugOverlay to show toolMode
        // For now, console log was added
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
