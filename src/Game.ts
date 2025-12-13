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

type ToolMode = 'PENCIL' | 'PEN' | 'ERASER';
type PenState = 'IDLE' | 'DRAGGING' | 'CHAINING';

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
    private penState: PenState = 'IDLE';
    private penLastNodeId: number | null = null; // The anchor node for chaining/dragging
    private penDragStartPos: Point = new Point(); // Where we started dragging
    
    // Animation State
    private tapAnimProgress = 1.0;
    private holdAnimPhase = 0;
    
    // Input Logic State
    private wasDown = false;
    private inputDownTime = 0;
    private maxTouches = 0;
    private interactionMode: 'NONE' | 'CRUCIBLE' | 'FLOW' | 'PEN' | 'ERASER' = 'NONE';

    constructor(app: Application) {
        this.app = app;
        this.inputState = createInputManager(app);
        this.debugOverlay = new DebugOverlay();
        
        // Initialize UI
        this.toolbar = new Toolbar((tool) => {
            this.setTool(tool);
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

    private setTool(mode: ToolMode) {
        if (this.toolMode === 'PEN') {
            this.graphSystem.commitActiveNodes();
            this.toolbar.setPenState(false);
        }
        this.toolMode = mode;
        this.toolbar.setTool(mode);
        
        // Reset Pen State
        this.penState = 'IDLE';
        this.penLastNodeId = null;
        this.graphSystem.clearPreview();
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

    // Keyboard Listener in InputManager handles keydown, we read it here?
    // Wait, handleInput is polled. But events like 'ESCAPE' are ephemeral.
    // InputManager needs to hold the key until consumed? Or we assume check happens fast enough.
    // 'state.debugKey' is held.
    
    private handleInput(ticker: Ticker) {
        // Debug/Tool Input
        if (this.inputState.debugKey) {
            const k = this.inputState.debugKey;
            switch (k) {
                case '1': this.mapSystem.setMode(MapShape.FULL); this.resourceSystem.spawnRandomly(); break;
                // ... (modes 2-7) ...
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
                    // Tool Switch -> Commit current path
                    if (this.toolMode === 'PEN') {
                        this.graphSystem.commitActiveNodes();
                        this.toolbar.setPenState(false); // Reset Checkmark
                    }
                    const nextTool = this.toolMode === 'PENCIL' ? 'PEN' : 'PENCIL'; 
                    this.setTool(nextTool);
                    break;
                
                case 'ESCAPE':
                    if (this.toolMode === 'PEN') {
                        // Cancel -> Destroy active nodes
                        this.graphSystem.abortActiveNodes();
                        this.penState = 'IDLE';
                        this.penLastNodeId = null;
                        this.graphSystem.clearPreview();
                        this.toolbar.setPenState(false); // Reset Checkmark
                    }
                    break;
                
                case 'ENTER':
                case 'SPACE':
                    if (this.toolMode === 'PEN') {
                        // Commit Chain
                        this.graphSystem.commitActiveNodes();
                        this.penState = 'IDLE';
                        this.penLastNodeId = null;
                        this.graphSystem.clearPreview();
                        this.toolbar.setPenState(false); // Reset Checkmark
                    }
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

        // Track max touches
        if (isDown) {
            this.maxTouches = Math.max(this.maxTouches, this.inputState.touchCount);
        } else {
            // Reset on release (after processing logic)
        }

        // 0. Right Click (Just Pressed Logic simulation for Commit)
        // Since we don't have a "wasRightDown", we might re-trigger if held. 
        // But Commit is idempotent usually (clears active).
        // Better: Check `isRightDown`.
        if (this.inputState.isRightDown) {
             if (this.toolMode === 'PEN') {
                this.graphSystem.commitActiveNodes();
                this.penState = 'IDLE';
                this.penLastNodeId = null;
                this.graphSystem.clearPreview();
                this.toolbar.setPenState(false); 
            }
        }

        // 1. Just Pressed
        if (isDown && !this.wasDown) {
            this.inputDownTime = now;
            this.maxTouches = this.inputState.touchCount; // Init tracking
            
            // Interaction Mode Logic
            const dx = mx - this.crucible.x;
            const dy = my - this.crucible.y;
            const distSq = dx*dx + dy*dy;

            if (distSq < CONFIG.CRUCIBLE_RADIUS**2) {
                this.interactionMode = 'CRUCIBLE';
            } else if (this.toolMode === 'PEN') {
                this.interactionMode = 'PEN';
                
                const clickedNode = this.graphSystem.getNodeAt(mx, my);
                
                // STATE MACHINE INPUT
                if (this.penState === 'IDLE' || this.penState === 'CHAINING') {
                    if (clickedNode) {
                        // Clicked existing node -> Start Drag or Chain from here
                        this.penLastNodeId = clickedNode.id;
                        this.penState = 'DRAGGING'; 
                        this.penDragStartPos.set(clickedNode.x, clickedNode.y);
                    } else {
                        // Clicked empty -> Create Node -> Start Chain
                        // OR: Just start dragging a ghost line from this empty point? 
                        // Spec says: Tap(Empty) -> Create A -> Goto CHAINING.
                        // But also: Drag Start(Existing) -> Goto DRAGGING.
                        
                        // Let's implement:
                        // 1. Create Node A immediately.
                        const newNode = this.graphSystem.addNode(mx, my);
                        
                        // 2. If we were chaining, link to previous
                        if (this.penState === 'CHAINING' && this.penLastNodeId !== null) {
                            this.graphSystem.createLink(this.penLastNodeId, newNode.id, TaskIntent.RED_ATTACK);
                        }
                        
                        // 3. Set new node as anchor
                        this.penLastNodeId = newNode.id;
                        this.penDragStartPos.set(newNode.x, newNode.y);
                        
                        // 4. Enter DRAGGING state immediately to allow "Drag to link" 
                        // even after creating a new node? 
                        // Actually, if it's a TAP, we go to CHAINING. If it's a HOLD, we go to DRAGGING.
                        // Since this is 'Just Pressed', let's assume DRAGGING for now, 
                        // and if released quickly without moving, we treat as TAP (Chain).
                        this.penState = 'DRAGGING';
                        this.toolbar.setPenState(true); // Assuming we started a chain
                    }
                }
            } else if (this.toolMode === 'ERASER') {
                this.interactionMode = 'ERASER';
                this.performErasure(mx, my);
            } else {
                this.interactionMode = 'FLOW';
            }
        }

        // 2. Holding / Dragging
        if (isDown) {
            // Check for Multi-touch Abort Signal immediately if needed?
            // User said "Abort/Undo = Two-Finger Tap".
            // If we detect 2 fingers, we can abort immediately or wait for release.
            // Waiting for release is safer for "Tap" gestures.
            
            if (this.interactionMode === 'CRUCIBLE') {
                // ... (Existing Crucible Hold Logic) ...
                const holdDuration = now - this.inputDownTime;
                if (holdDuration >= CONFIG.TAP_THRESHOLD_MS) {
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
                this.performErasure(mx, my);
            } else if (this.interactionMode === 'PEN' && this.penState === 'DRAGGING') {
                // Visualize Drag
                // Snap check
                let targetX = mx;
                let targetY = my;
                const hoverNode = this.graphSystem.getNodeAt(mx, my);
                if (hoverNode) {
                    targetX = hoverNode.x;
                    targetY = hoverNode.y;
                }
                
                if (this.penDragStartPos.x !== 0 || this.penDragStartPos.y !== 0) { // Safety check
                     this.graphSystem.drawPreviewLine(this.penDragStartPos.x, this.penDragStartPos.y, targetX, targetY, true);
                }
            }
        }

        // 3. Just Released
        if (!isDown && this.wasDown) {
            // Multi-touch Abort Check
            if (this.maxTouches >= 2) {
                // Two-finger tap detected -> Abort
                if (this.interactionMode === 'PEN') {
                    this.graphSystem.abortActiveNodes();
                    this.penState = 'IDLE';
                    this.penLastNodeId = null;
                    this.graphSystem.clearPreview();
                    this.toolbar.setPenState(false);
                }
                // Reset everything
                this.interactionMode = 'NONE';
                this.spawnTimer = 0;
                this.wasDown = isDown;
                this.lastMousePos = this.inputState.mousePosition.clone();
                this.maxTouches = 0;
                return; // Early exit
            }

            if (this.interactionMode === 'CRUCIBLE') {
                // ... (Existing Crucible Release Logic) ...
                const holdDuration = now - this.inputDownTime;
                if (holdDuration < CONFIG.TAP_THRESHOLD_MS) {
                    for(let i=0; i<CONFIG.SPRIGS_PER_TAP; i++) {
                         this.sprigSystem.spawnSprig(this.crucible.x, this.crucible.y);
                    }
                    this.updateUI();
                    this.tapAnimProgress = 0;
                }
            } else if (this.interactionMode === 'PEN' && this.penState === 'DRAGGING') {
                // Commit the Drag
                const hoverNode = this.graphSystem.getNodeAt(mx, my);
                
                // Logic:
                // 1. If released on a Node (different from start) -> Link & Chain
                // 2. If released on Empty -> Create Node B -> Link & Chain
                // 3. If released on Start Node (Tap) -> Switch to CHAINING (Wait for next click)
                
                if (hoverNode && hoverNode.id !== this.penLastNodeId) {
                    // Linked to existing
                    if (this.penLastNodeId !== null) {
                        this.graphSystem.createLink(this.penLastNodeId, hoverNode.id, TaskIntent.RED_ATTACK);
                    }
                    this.penLastNodeId = hoverNode.id;
                    this.graphSystem.setActiveNode(hoverNode.id); // Highlight
                    this.penState = 'CHAINING';
                    this.toolbar.setPenState(true); // Show Checkmark
                } else if (!hoverNode) {
                    // Dragged to empty -> Create new node
                    const distSq = (mx - this.penDragStartPos.x)**2 + (my - this.penDragStartPos.y)**2;
                    if (distSq > 100) { 
                        const newNode = this.graphSystem.addNode(mx, my);
                        if (this.penLastNodeId !== null) {
                            this.graphSystem.createLink(this.penLastNodeId, newNode.id, TaskIntent.RED_ATTACK);
                        }
                        this.penLastNodeId = newNode.id;
                        this.graphSystem.setActiveNode(newNode.id); // Highlight
                        this.penState = 'CHAINING';
                        this.toolbar.setPenState(true); // Show Checkmark
                    } else {
                        // Tap logic
                        this.penState = 'CHAINING';
                        this.toolbar.setPenState(true); // Show Checkmark
                    }
                } else {
                    // Released on same node
                    this.penState = 'CHAINING';
                    this.toolbar.setPenState(true); // Show Checkmark
                }
                
                this.graphSystem.clearPreview();
            }
            
            // Reset
            this.interactionMode = 'NONE';
            this.spawnTimer = 0;
            this.maxTouches = 0; // Reset max touches
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
        
        // Pen Preview
        if (this.toolMode === 'PEN' && this.penState === 'DRAGGING' && this.penLastNodeId !== null) {
            // This is actually handled in the Input Loop (Immediate Mode) for responsiveness?
            // No, the input loop updates state, renderVisuals should draw.
            // But handleInput is called before renderVisuals in update().
            // Wait, I put drawPreviewLine inside handleInput's "Holding" block. 
            // That works because handleInput runs every frame.
            // However, it's better practice to separate logic and render.
            // But since drawPreviewLine clears and redraws the graph graphics... calling it twice is bad.
            // Let's rely on handleInput for now as it has the mouse coordinates handy.
            // Actually, handleInput calls it every frame. That's fine.
        } else if (this.toolMode === 'PEN' && this.penState === 'CHAINING' && this.penLastNodeId !== null) {
            // Pulse the last node?
            // TODO: Add visual feedback for active chaining node
        }
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
