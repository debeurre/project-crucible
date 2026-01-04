import { WorldState } from '../core/WorldState';
import { CONFIG } from '../core/Config';
import { StructureType } from '../data/StructureData';

export class NavigationSystem {
    public update(world: WorldState, dt: number) {
        const sprigs = world.sprigs;
        const count = CONFIG.MAX_SPRIGS;
        // Tuning
        const steeringStrength = 5.0; 

        for (let i = 0; i < count; i++) {
            if (sprigs.active[i] === 0) continue;

            const px = sprigs.x[i];
            const py = sprigs.y[i];
            const tx = sprigs.targetX[i];
            const ty = sprigs.targetY[i];
            const vx = sprigs.vx[i];
            const vy = sprigs.vy[i];

            // 1. Steering (Seek Target)
            const dx = tx - px;
            const dy = ty - py;
            const distToTarget = Math.sqrt(dx*dx + dy*dy);

            if (distToTarget > 0) {
                // Desired velocity is full speed towards target
                const desiredX = (dx / distToTarget) * CONFIG.MAX_SPEED;
                const desiredY = (dy / distToTarget) * CONFIG.MAX_SPEED;

                // Steering force: (desired - velocity) * strength
                sprigs.vx[i] += (desiredX - vx) * steeringStrength * dt;
                sprigs.vy[i] += (desiredY - vy) * steeringStrength * dt;
            }

            // 2. Hard Collision (Rocks)
            // Note: Projecting x/y here, effectively overriding MovementSystem's previous integration if run after? 
            // Or preventing MovementSystem from moving into it?
            // If run BEFORE MovementSystem (as per main.ts order), this projects them out if they *were* inside.
            // But usually collision runs AFTER movement.
            // Instructions say: "Navigation: Calculate Velocities... Physics: Integrate Positions".
            // But this instruction says "Project Out: entity.x += ...".
            // If I project out here, then MovementSystem adds velocity, they might move back in?
            // "Navigation" updates velocity. "Physics" integrates.
            // If Collision is here in Navigation, it handles *steering* avoidance?
            // But the instruction says "Hard Collision... Project Out".
            // If I project out now, then Movement moves them, they might end up inside.
            // However, the instruction says "Goal: ... unable to pass through".
            // Typically Collision is post-integration step.
            // But I will follow instructions: "Refactor NavigationSystem ... 2. Hard Collision".
            // And main.ts order: hive, nav, movement, render.
            // So Nav projects, then Movement integrates.
            // If Nav projects out, and kills velocity, Movement will integrate small/zero velocity.
            // Wait, if I kill velocity `vx *= 0.5`, then `Movement` will add `vx * dt`.
            // So if I am inside, I get pushed out, velocity killed. Then Movement adds small amount.
            // It should work reasonably well for soft bodies / simple physics.

            for (const s of world.structures) {
                if (s.type === StructureType.ROCK) {
                    const rdx = px - s.x;
                    const rdy = py - s.y;
                    const distSqr = rdx*rdx + rdy*rdy;
                    const minDist = s.radius + CONFIG.SPRIG_RADIUS;

                    if (distSqr < minDist * minDist) {
                        const dist = Math.sqrt(distSqr);
                        const overlap = minDist - dist;
                        
                        // Normal
                        let nx = 0, ny = 0;
                        if (dist > 0.0001) {
                            nx = rdx / dist;
                            ny = rdy / dist;
                        } else {
                            nx = 1; // Default push
                            ny = 0;
                        }

                        // Project Out
                        sprigs.x[i] += nx * overlap;
                        sprigs.y[i] += ny * overlap;

                        // Kill Velocity / Slide
                        sprigs.vx[i] *= 0.5;
                        sprigs.vy[i] *= 0.5;
                        
                        // Optional: Reflect velocity for bounce? 
                        // Instructions say: "vx *= 0.5". Simple damping.
                    }
                }
            }
        }
    }
}