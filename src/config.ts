// src/config.ts

export const CONFIG = {
  SPRIG_COUNT: 1500,
  SPRIG_RADIUS: 2,
  SPRIG_COLOR: 0x00ff00,
  SPRIG_FLASH_COLOR: 0xffffff,
  
  // Boids-lite behavior
  SEPARATION_FORCE: 0.05,
  COHESION_FORCE: 0.01,
  ALIGNMENT_FORCE: 0.025,
  PERCEPTION_RADIUS: 20,
  
  // Interaction
  PHEROMONE_PATH_ATTRACTION: 0.1,
  PULSE_FORCE: 50,
  PULSE_RADIUS: 100,
  
  // Visuals
  TRAIL_LENGTH: 10,
  SCREEN_SHAKE_INTENSITY: 5,
  SCREEN_SHAKE_DECAY: 0.9,

  // Physics
  MAX_SPEED: 2,
  FRICTION: 0.95,
  GRAVITY: 0.0, // No gravity for now

  // Map System
  LAND_COLOR: 0xa1855f, // Medium Tan - The play area
  BG_COLOR: 0x9eb1cb,   // Blue-ish Grey - The void
  CELL_SIZE: 20,        // Resolution of the terrain chunks
  
  // Map Modes
  MAP_WIDTH: 1600,
  MAP_HEIGHT: 800,
};
