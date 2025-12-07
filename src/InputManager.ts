import { Application, Point, FederatedPointerEvent } from 'pixi.js';

export interface InputState {
    isDown: boolean;
    isDragging: boolean;
    path: Point[];      // The trail of points for the pheromone line
    pulse: Point | null; // The specific point where a "Tap" occurred
    debugKey: string | null;
    isHolding: boolean;
    mousePosition: Point; // New: Current mouse global position
}

export function createInputManager(app: Application): InputState {
    const state: InputState = {
        isDown: false,
        isDragging: false,
        path: [],
        pulse: null,
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
        // Store global coordinates
        state.path = [new Point(e.global.x, e.global.y)];
    });

    app.stage.on('pointermove', (e: FederatedPointerEvent) => {
        state.mousePosition.copyFrom(e.global); // Update position
        if (state.isDown) {
            state.isDragging = true;
            // Add point to path
            state.path.push(new Point(e.global.x, e.global.y));
        }
    });

    app.stage.on('pointerup', (e: FederatedPointerEvent) => {
        if (!state.isDragging) {
            // It was a quick tap, not a drag. 
            // Save the LOCATION of the tap into 'pulse'
            state.pulse = new Point(e.global.x, e.global.y);
        }
        
        // Reset drag state
        state.isDown = false;
        state.isHolding = false;
        state.path = []; 
    });

    app.stage.on('pointerupoutside', () => {
        state.isDown = false;
        state.isHolding = false;
        state.path = [];
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