import { Application, Point, FederatedPointerEvent } from 'pixi.js';

export interface MouseState {
    isDown: boolean;
    isDragging: boolean;
    path: Point[];      // The trail of points for the pheromone line
    pulse: Point | null; // The specific point where a "Tap" occurred
}

export function createInputManager(app: Application): MouseState {
    const mouseState: MouseState = {
        isDown: false,
        isDragging: false,
        path: [],
        pulse: null,
    };

    // 1. Enable interactivity on the stage
    // In v8, we use 'eventMode' instead of 'interactive'
    app.stage.eventMode = 'static';

    // 2. Make the hit area cover the whole screen
    // Without this, clicking on empty black space might be ignored
    app.stage.hitArea = app.screen;

    // 3. Event Listeners
    app.stage.on('pointerdown', (e: FederatedPointerEvent) => {
        mouseState.isDown = true;
        mouseState.isDragging = false;
        // Store global coordinates
        mouseState.path = [new Point(e.global.x, e.global.y)];
    });

    app.stage.on('pointermove', (e: FederatedPointerEvent) => {
        if (mouseState.isDown) {
            mouseState.isDragging = true;
            // Add point to path
            mouseState.path.push(new Point(e.global.x, e.global.y));
        }
    });

    app.stage.on('pointerup', (e: FederatedPointerEvent) => {
        if (!mouseState.isDragging) {
            // It was a quick tap, not a drag. 
            // Save the LOCATION of the tap into 'pulse'
            mouseState.pulse = new Point(e.global.x, e.global.y);
        }
        
        // Reset drag state
        mouseState.isDown = false;
        mouseState.isDragging = false;
        mouseState.path = [];
    });

    // Handle dragging off-screen
    app.stage.on('pointerupoutside', () => {
        mouseState.isDown = false;
        mouseState.isDragging = false;
        mouseState.path = [];
    });

    return mouseState;
}