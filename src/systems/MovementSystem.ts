import { WorldState } from '../core/WorldState';
import { CONFIG } from '../core/Config';
import { getStructureStats } from '../data/StructureData';

export class MovementSystem {
    public update(world: WorldState, dt: number) {
        const sprigs = world.sprigs;
        const count = CONFIG.MAX_SPRIGS;
        const map = world.map;

        for (let i = 0; i < count; i++) {
            if (sprigs.active[i] === 0) continue;

            // Terrain Logic
            // ... (keeping existing logic) ...
            const nextX = sprigs.x[i] + sprigs.vx[i] * dt;
            const nextY = sprigs.y[i] + sprigs.vy[i] * dt;
            
            const nextCol = Math.floor(nextX / CONFIG.GRID_SIZE);
            const nextRow = Math.floor(nextY / CONFIG.GRID_SIZE);

            // Check if blocked (Hardcoded canSwim = false)
            if (map.isBlocked(nextCol, nextRow, false)) {
                // Hit a wall/water - Stop completely for now
                sprigs.vx[i] = 0;
                sprigs.vy[i] = 0;
            } else {
                // Apply Terrain Speed Modifier
                const speedMod = map.getSpeed(nextCol, nextRow);
                sprigs.x[i] += sprigs.vx[i] * dt * speedMod;
                sprigs.y[i] += sprigs.vy[i] * dt * speedMod;
            }

            // Collision with Solid Structures
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
        }
    }
}
