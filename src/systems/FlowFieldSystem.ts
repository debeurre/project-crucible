import { WorldState } from '../core/WorldState';
import { CONFIG } from '../core/Config';

export class FlowFieldSystem {
    public update(world: WorldState, dt: number) {
        const sprigs = world.sprigs;
        const count = CONFIG.MAX_SPRIGS;
        
        // The Painter
        for (let i = 0; i < count; i++) {
            if (sprigs.active[i] === 0) continue;
            
            // Only Haulers paint the path back to the Source
            if (sprigs.cargo[i] > 0) {
                const vx = sprigs.vx[i];
                const vy = sprigs.vy[i];
                const speedSq = vx*vx + vy*vy;
                
                if (speedSq > 0.01) { // Moving
                    const speed = Math.sqrt(speedSq);
                    // Invert velocity to point BACK to where they came from (the source)
                    // Normalizing: (-vx / speed, -vy / speed)
                    world.flowField.addVector(sprigs.x[i], sprigs.y[i], -vx / speed, -vy / speed);
                }
            }
        }
        
        // The Decay: Slower decay for ~30s duration (0.997^1800 frames ~= 0.004)
        world.flowField.decay(0.997);
    }
}
