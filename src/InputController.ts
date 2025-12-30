import { Ticker } from 'pixi.js';
import { InputState } from './InputManager';
import { ToolManager } from './tools/ToolManager';
import { SprigSystem } from './SprigSystem';
import { MapSystem } from './systems/MapSystem';
import { VisualEffects } from './systems/VisualEffects';
import { FlowFieldSystem } from './systems/FlowFieldSystem';
import { GraphSystem } from './systems/GraphSystem';
import { DebugOverlay } from './ui/DebugOverlay';
import { CONFIG } from './config';
import { TaskIntent } from './types/GraphTypes';
import { ResourceSystem } from './systems/ResourceSystem';

export class InputController {
    private inputState: InputState;
    private toolManager: ToolManager;
    private sprigSystem: SprigSystem;
    private visualEffects: VisualEffects;
    private flowFieldSystem: FlowFieldSystem;
    private graphSystem: GraphSystem;
    private debugOverlay: DebugOverlay;

    // State
    private wasDown = false;
    private inputDownTime = 0;
    private maxTouches = 0;
    private interactionMode: 'NONE' | 'CRUCIBLE' | 'TOOL' = 'NONE';
    private spawnTimer = 0;
    
    // Animation State Accessors
    public lastInputDownTime = 0;
    public isCrucibleMode = false;
    
    public onCrucibleTap?: () => void;
    public onUIUpdate?: () => void;
    private resourceSystem: ResourceSystem;

    constructor(
        inputState: InputState,
        toolManager: ToolManager,
        sprigSystem: SprigSystem,
        _mapSystem: MapSystem,
        visualEffects: VisualEffects,
        flowFieldSystem: FlowFieldSystem,
        graphSystem: GraphSystem,
        debugOverlay: DebugOverlay,
        resourceSystem: ResourceSystem
    ) {
        this.inputState = inputState;
        this.toolManager = toolManager;
        this.sprigSystem = sprigSystem;
        this.visualEffects = visualEffects;
        this.flowFieldSystem = flowFieldSystem;
        this.graphSystem = graphSystem;
        this.debugOverlay = debugOverlay;
        this.resourceSystem = resourceSystem;
    }

    public update(ticker: Ticker) {
        this.handleHotkeys();
        this.handlePointer(ticker);
    }

    private handleHotkeys() {
        if (!this.inputState.debugKey) return;

        const k = this.inputState.debugKey;
        switch (k) {
            case '1': this.toolManager.setActiveIntent(TaskIntent.GREEN_HARVEST); break;
            case '2': this.toolManager.setActiveIntent(TaskIntent.RED_ATTACK); break;
            case '3': this.toolManager.setActiveIntent(TaskIntent.BLUE_SCOUT); break;
            case '4': this.toolManager.setActiveIntent(TaskIntent.YELLOW_ASSIST); break;

            case 'Q': this.visualEffects.toggleBlur(); break;
            case 'W': this.visualEffects.toggleThreshold(); break;
            case 'E': this.visualEffects.toggleDisplacement(); break;
            case 'R': this.visualEffects.toggleNoise(); break;

            case 'G': this.flowFieldSystem.toggleGrid(); break;
            case 'D': this.debugOverlay.toggle(); break;

            case 'F': 
                this.flowFieldSystem.clearAll();
                this.sprigSystem.clearAll();
                this.graphSystem.clearAll();
                break;

            case 'S': this.sprigSystem.clearAll(); break;
        }
        if (this.onUIUpdate) this.onUIUpdate();
        this.inputState.debugKey = null;
    }

    private handlePointer(ticker: Ticker) {
        const isDown = this.inputState.isDown;
        const now = performance.now();
        const mx = this.inputState.mousePosition.x;
        const my = this.inputState.mousePosition.y;
        
        const heartPos = this.resourceSystem.getCastlePosition();

        if (isDown) {
            this.maxTouches = Math.max(this.maxTouches, this.inputState.touchCount);
        }

        // 1. Just Pressed
        if (isDown && !this.wasDown) {
            this.inputDownTime = now;
            this.lastInputDownTime = now; // Expose for animation
            this.maxTouches = this.inputState.touchCount; 
            
            // Interaction Mode Logic
            const dx = mx - heartPos.x;
            const dy = my - heartPos.y;
            const distSq = dx*dx + dy*dy;

            const sinkType = this.resourceSystem.getSinkType();
            // Only allow interaction if sink is CRUCIBLE or NEST
            if ((sinkType === 'CRUCIBLE' || sinkType === 'NEST') && distSq < CONFIG.CASTLE_RADIUS**2) {
                this.interactionMode = 'CRUCIBLE';
                this.isCrucibleMode = true;
            } else {
                this.interactionMode = 'TOOL';
                this.isCrucibleMode = false;
                this.toolManager.onDown(mx, my);
            }
        }

        // 2. Holding
        if (isDown) {
            if (this.interactionMode === 'CRUCIBLE') {
                const holdDuration = now - this.inputDownTime;
                if (holdDuration >= CONFIG.TAP_THRESHOLD_MS) {
                    this.spawnTimer += ticker.deltaMS / 1000;
                    const spawnInterval = 1 / CONFIG.SPRIGS_PER_SECOND_HELD;
                    while (this.spawnTimer >= spawnInterval) {
                        this.sprigSystem.spawnSprig(heartPos.x, heartPos.y);
                        this.spawnTimer -= spawnInterval;
                        if (this.onUIUpdate) this.onUIUpdate();
                    }
                }
            } else if (this.interactionMode === 'TOOL') {
                this.toolManager.onHold(mx, my, ticker);
            }
        }

        // 3. Just Released
        if (!isDown && this.wasDown) {
            if (this.maxTouches >= 2) {
                this.resetState();
                return;
            }

            if (this.interactionMode === 'CRUCIBLE') {
                const holdDuration = now - this.inputDownTime;
                if (holdDuration < CONFIG.TAP_THRESHOLD_MS) {
                    for(let i=0; i<CONFIG.SPRIGS_PER_TAP; i++) {
                         this.sprigSystem.spawnSprig(heartPos.x, heartPos.y);
                    }
                    if (this.onUIUpdate) this.onUIUpdate();
                    if (this.onCrucibleTap) this.onCrucibleTap();
                }
            } else if (this.interactionMode === 'TOOL') {
                this.toolManager.onUp(mx, my);
            }
            
            this.resetState();
        }

        this.wasDown = isDown;
    }

    private resetState() {
        this.interactionMode = 'NONE';
        this.isCrucibleMode = false;
        this.spawnTimer = 0;
        this.wasDown = false; // Actually handled by loop, but safe to reset logic flags
        this.maxTouches = 0;
    }
}
