import { WorldState } from '../core/WorldState';
import { CONFIG } from '../core/Config';
import { StructureType } from '../data/StructureData';

export class MovementSystem {
    public update(world: WorldState, dt: number) {
        const sprigs = world.sprigs;
        const count = CONFIG.MAX_SPRIGS;

        for (let i = 0; i < count; i++) {
            if (sprigs.active[i] === 0) continue;

            // Simple Physics
            sprigs.x[i] += sprigs.vx[i] * dt;
            sprigs.y[i] += sprigs.vy[i] * dt;

            // Collision with Rocks
            for (const s of world.structures) {
                if (s.type === StructureType.ROCK) {
                    const dx = sprigs.x[i] - s.x;
                    const dy = sprigs.y[i] - s.y;
                    const distSq = dx*dx + dy*dy;
                    const minDist = s.radius + CONFIG.SPRIG_RADIUS;
                    
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
