import { Application, Point, FederatedPointerEvent } from 'pixi.js';

export interface InputState {
    isDown: boolean;
    isDragging: boolean;
    debugKey: string | null;
    isHolding: boolean;
    mousePosition: Point; // New: Current mouse global position
}

export function createInputManager(app: Application): InputState {
    const state: InputState = {
        isDown: false,
        isDragging: false,
        debugKey: null,
        isHolding: false,
        mousePosition: new Point(), // Initialize
    };

    // 1. Enable interactivity on the stage
    // In v8, we use 'eventMode' instead of 'interactive'
    app.stage.eventMode = 'static';

    // 2. Make the hit area cover the whole screen
    // Without this, clicking on empty black space might be ignored
    app.stage.hitArea = app.screen;

    // 3. Event Listeners
    app.stage.on('pointerdown', (e: FederatedPointerEvent) => {
        state.isDown = true;
        state.isDragging = false;
        state.isHolding = true;
        state.mousePosition.copyFrom(e.global); // Update position
    });

    app.stage.on('pointermove', (e: FederatedPointerEvent) => {
        state.mousePosition.copyFrom(e.global); // Update position
        if (state.isDown) {
            state.isDragging = true;
        }
    });

    app.stage.on('pointerup', () => {
        // Reset drag state
        state.isDown = false;
        state.isHolding = false;
    });

    app.stage.on('pointerupoutside', () => {
        state.isDown = false;
        state.isHolding = false;
    });
    
    // Keyboard Listener
    window.addEventListener('keydown', (e) => {
        const k = e.key.toUpperCase();
        if ((k >= '1' && k <= '9') || ['Q','W','E','R'].includes(k)) {
            state.debugKey = k;
        }
    });

    return state;
}