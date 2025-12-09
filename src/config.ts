// src/config.ts

export const CONFIG = {
  MAX_SPRIG_COUNT: 5000, // Max capacity of the system
  SPRIGS_PER_SECOND_SPAWN: 20, // New: how many per second to spawn on hold

  SPRIG_RADIUS: 6,
  SPRIG_COLOR: 0x228B22, // Forest Green
  SPRIG_FLASH_COLOR: 0xffffff,
  
  // Boids-lite behavior
  SEPARATION_FORCE: 0.1,
  COHESION_FORCE: 0.01,
  ALIGNMENT_FORCE: 0.025,
  PERCEPTION_RADIUS: 20,
  
  // Physics
  MAX_SPEED: 1,
  FRICTION: 0.95,
  GRAVITY: 0.0, // No gravity for now

  // Map System
  LAND_COLOR: 0xD2B48C, // Medium Tan - The play area
  BG_COLOR: 0xA9A9A9,   // Dark Gray - The void
  CELL_SIZE: 20,        // Resolution of the terrain chunks
  
  // Map Modes
  MAP_WIDTH: 1600,
  MAP_HEIGHT: 800,

  // Visual Effects
  VISUALS: {
      WIGGLE_STRENGTH: 0.5,       // Master scale for displacement
      DISPLACEMENT_SCALE: 30,     // How much the lines distort
      DISPLACEMENT_SPEED: 5,    // How fast the noise scrolls
      BLUR_STRENGTH: 1,           // High blur for liquid blend
      NOISE_STRENGTH: 0.1,        // Paper grain amount
      CONTRAST_AMOUNT: 5,         // High contrast to sharpen blur into blobs
  },

  // Crucible (Sink)
  CRUCIBLE_RADIUS: 25,
  CRUCIBLE_COLOR: 0xFFD700, // Gold
  CRUCIBLE_SPAWN_PADDING: 20, // Distance from crucible edge to spawn sprigs

  // Resource Node (Wood Source)
  RESOURCE_NODE_COLOR: 0xA52A2A, // Brown
  RESOURCE_NODE_RADIUS: 50,

  // Flow Field
  FLOW_FIELD_CELL_SIZE: 10,
  FLOW_FIELD_FORCE_SCALE: 0.1, // How much the flow field influences sprigs
  FLOW_FIELD_VISUAL_ALPHA: 0.5, // Increased visibility
  FLOW_FIELD_VISUAL_COLOR: 0xFF0000, // Red for debug
  FLOW_FIELD_VISUAL_ARROW_LENGTH: 5,

  // Sprig Cargo
  SPRIG_CARGO_SLOWDOWN_FACTOR: 0.7, // Sprigs move slower when carrying cargo
  SPRIG_CARGO_OFFSET_Y: -12, // Y-offset for cargo sprite relative to sprig
};
