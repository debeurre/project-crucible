import { WorldState } from '../core/WorldState';
import { CONFIG } from '../core/Config';
import { getStructureStats } from '../data/StructureData';
import { Terrain } from '../data/MapData';

export class PhysicsSystem {
    public update(world: WorldState, dt: number) {
        const sprigs = world.sprigs;
        const count = CONFIG.MAX_SPRIGS;
        const map = world.map;

        for (let i = 0; i < count; i++) {
            if (sprigs.active[i] === 0) continue;

            // Capture Debug Forces (before reset)
            sprigs.debugAx[i] = sprigs.ax[i];
            sprigs.debugAy[i] = sprigs.ay[i];

            // 1. Integrate Acceleration
            sprigs.vx[i] += sprigs.ax[i] * dt;
            sprigs.vy[i] += sprigs.ay[i] * dt;

            // 2. Determine Friction & Max Speed
            const gridX = Math.floor(sprigs.x[i] / CONFIG.GRID_SIZE);
            const gridY = Math.floor(sprigs.y[i] / CONFIG.GRID_SIZE);
            
            // Default Friction
            let friction = CONFIG.FRICTION_BASE;

            if (gridX >= 0 && gridX < map.width && gridY >= 0 && gridY < map.height) {
                const terrain = map.terrain[map.getIndex(gridX, gridY)];
                if (terrain === Terrain.MUD) {
                    friction = CONFIG.FRICTION_MUD;
                } else if (terrain === Terrain.WATER) {
                    friction = CONFIG.FRICTION_WATER;
                }
            }

            // New Friction Logic: Limit Top Speed
            const baseMaxSpeed = sprigs.speed[i];
            const currentMaxSpeed = baseMaxSpeed * (1.0 - friction);

            // 3. Clamp Speed (Friction Application)
            const vx = sprigs.vx[i];
            const vy = sprigs.vy[i];
            const speedSq = vx*vx + vy*vy;
            
            if (speedSq > currentMaxSpeed * currentMaxSpeed) {
                const speed = Math.sqrt(speedSq) || 0.001;
                sprigs.vx[i] = (vx / speed) * currentMaxSpeed;
                sprigs.vy[i] = (vy / speed) * currentMaxSpeed;
            }

            // 4. Update Position
            const nextX = sprigs.x[i] + sprigs.vx[i] * dt;
            const nextY = sprigs.y[i] + sprigs.vy[i] * dt;

            // 5. Collision Resolution (Wall/Map)
            const nextCol = Math.floor(nextX / CONFIG.GRID_SIZE);
            const nextRow = Math.floor(nextY / CONFIG.GRID_SIZE);

            if (map.isBlocked(nextCol, nextRow)) {
                 sprigs.vx[i] = 0;
                 sprigs.vy[i] = 0;
                 // Don't update pos
            } else {
                 sprigs.x[i] = nextX;
                 sprigs.y[i] = nextY;
            }

            // 6. Collision with Structures
            for (const s of world.structures) {
                const stats = getStructureStats(s.type);
                if (stats.solid) {
                    const dx = sprigs.x[i] - s.x;
                    const dy = sprigs.y[i] - s.y;
                    const distSq = dx*dx + dy*dy;
                    const minDist = stats.radius + CONFIG.SPRIG_RADIUS;
                    
                    if (distSq < minDist * minDist) {
                        const dist = Math.sqrt(distSq) || 0.001;
                        const pen = minDist - dist;
                        const nx = dx / dist;
                        const ny = dy / dist;

                        // Push Back
                        sprigs.x[i] += nx * pen;
                        sprigs.y[i] += ny * pen;

                        // Slide Velocity (Kill component towards rock)
                        const dot = sprigs.vx[i] * nx + sprigs.vy[i] * ny;
                        if (dot < 0) {
                            sprigs.vx[i] -= dot * nx;
                            sprigs.vy[i] -= dot * ny;
                        }
                    }
                }
            }

            // 7. Reset Acceleration
            sprigs.ax[i] = 0;
            sprigs.ay[i] = 0;
        }
    }
}