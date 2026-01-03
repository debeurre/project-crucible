import { WorldState } from '../core/WorldState';
import { CONFIG } from '../core/Config';
import { StructureType } from '../data/StructureData';

export class NavigationSystem {
    public update(world: WorldState, dt: number) {
        const sprigs = world.sprigs;
        const count = CONFIG.MAX_SPRIGS;
        const speed = 2.0; // Base speed

        for (let i = 0; i < count; i++) {
            if (sprigs.active[i] === 0) continue;

            const px = sprigs.x[i];
            const py = sprigs.y[i];
            const tx = sprigs.targetX[i];
            const ty = sprigs.targetY[i];

            // Steering to Target
            const dx = tx - px;
            const dy = ty - py;
            const dist = Math.sqrt(dx*dx + dy*dy);

            if (dist > 0) {
                const nx = dx / dist;
                const ny = dy / dist;
                sprigs.vx[i] += nx * speed * dt;
                sprigs.vy[i] += ny * speed * dt;
            }

            // Obstacle Avoidance
            for (const s of world.structures) {
                if (s.type === StructureType.ROCK) {
                    const odx = px - s.x;
                    const ody = py - s.y;
                    const odistSq = odx*odx + ody*ody;
                    const minDist = s.radius + 10; // buffer
                    
                    if (odistSq < minDist*minDist) {
                        const odist = Math.sqrt(odistSq);
                        if (odist > 0.001) {
                            const force = (minDist - odist) / minDist;
                            const push = 5.0 * force * dt; // Strong push
                            sprigs.vx[i] += (odx / odist) * push;
                            sprigs.vy[i] += (ody / odist) * push;
                        }
                    }
                }
            }
        }
    }
}
