export const CONFIG = {
    // world
    TILE_SIZE: 32,
    WORLD_WIDTH: 60,    // tiles
    WORLD_HEIGHT: 35,   // tiles
    GRID_SIZE: 16,      // a*
    INTERACTION_BUFFER: 5,
    // sprigs
    MAX_SPRIGS: 2000,
    MAX_SPEED: 50.0,    // Pixels per second
    SPRIG_RADIUS: 5.0,
    // tools
    SCENT_STRENGTH: 500.0,
    SCENT_WEIGHT: 0.1,
    // wandering
    WANDER_COOLDOWN: 5.0,
    RAIL_MAGNET_STRENGTH: 5.0,
    RAIL_WEIGHT: 0.8,
    // hauling
    HAULER_DRAG: 1,
    HAULER_STEEP: 4,
    HAULER_STEP_DURATION: 1000
};

export const SCREEN_WIDTH = CONFIG.TILE_SIZE * CONFIG.WORLD_WIDTH;
export const SCREEN_HEIGHT = CONFIG.TILE_SIZE * CONFIG.WORLD_HEIGHT;
