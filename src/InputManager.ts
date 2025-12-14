import { Application, Point, FederatedPointerEvent } from 'pixi.js';

export interface InputState {
    isDown: boolean;
    isRightDown: boolean; // New
    isDragging: boolean;
    debugKey: string | null;
    isHolding: boolean;
    mousePosition: Point; // New: Current mouse global position
    touchCount: number; // Number of active pointers
}

export function createInputManager(app: Application): InputState {
    const activePointers = new Set<number>();
    
    const state: InputState = {
        isDown: false,
        isRightDown: false,
        isDragging: false,
        debugKey: null,
        isHolding: false,
        mousePosition: new Point(), // Initialize
        touchCount: 0
    };

    // 1. Enable interactivity on the stage
    // In v8, we use 'eventMode' instead of 'interactive'
    app.stage.eventMode = 'static';

    // 2. Make the hit area cover the whole screen
    // Without this, clicking on empty black space might be ignored
    app.stage.hitArea = app.screen;

    // 3. Event Listeners
    app.stage.on('pointerdown', (e: FederatedPointerEvent) => {
        activePointers.add(e.pointerId);
        state.touchCount = activePointers.size;
        state.mousePosition.copyFrom(e.global); // Update position

        if (e.button === 2) {
            state.isRightDown = true;
        } else {
            state.isDown = true;
            state.isDragging = false;
            state.isHolding = true;
        }
    });

    app.stage.on('pointermove', (e: FederatedPointerEvent) => {
        state.mousePosition.copyFrom(e.global); // Update position
        if (state.isDown) {
            state.isDragging = true;
        }
    });

    app.stage.on('pointerup', (e: FederatedPointerEvent) => {
        activePointers.delete(e.pointerId);
        state.touchCount = activePointers.size;
        
        if (e.button === 2) {
            state.isRightDown = false;
        } else {
            // Reset drag state only when ALL fingers are up (or simple logic for now)
            if (state.touchCount === 0) {
                state.isDown = false;
                state.isHolding = false;
            }
        }
    });

    app.stage.on('pointerupoutside', (e: FederatedPointerEvent) => {
        activePointers.delete(e.pointerId);
        state.touchCount = activePointers.size;
        
        if (e.button === 2) {
            state.isRightDown = false;
        } else {
            if (state.touchCount === 0) {
                state.isDown = false;
                state.isHolding = false;
            }
        }
    });
    
    // Keyboard Listener
    window.addEventListener('keydown', (e) => {
        const k = e.key.toUpperCase();
        if ((k >= '1' && k <= '9') || ['Q','W','E','R','F','S','G','T','D','ESCAPE','ENTER','SPACE','BACKSPACE','DELETE'].includes(k)) {
            state.debugKey = k;
        }
    });

    return state;
}