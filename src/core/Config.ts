export const CONFIG = {
    // World
    GRID_SIZE: 32,
    WORLD_WIDTH: 55,
    WORLD_HEIGHT: 30,
    // Sprigs
    MAX_SPRIGS: 500,
    START_SPRIGS: 10,
    MAX_SPEED: 100.0,
    SPRIG_RADIUS: 15.0,
    // Wander
    WANDER_SPEED: 40.0,
    LEASH_RADIUS: 150.0,
    WANDER_DIST: 100.0,
    WANDER_TMIN: 3.0,
    WANDER_TMAX: 5.0,

    // Tools
    TOOLS: {
        SPAWN_PER_TAP: 1,
        SPAWN_PER_SEC: 10,
        TAP_THRESHOLD_MS: 200,
    }
};

export const SCREEN_WIDTH = CONFIG.GRID_SIZE * CONFIG.WORLD_WIDTH;
export const SCREEN_HEIGHT = CONFIG.GRID_SIZE * CONFIG.WORLD_HEIGHT;