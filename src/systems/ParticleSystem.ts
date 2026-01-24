import { WorldState } from '../core/WorldState';
import { ParticleType } from '../data/ParticleData';

export class ParticleSystem {
    public update(world: WorldState, dt: number) {
        const p = world.particles;
        const sprigs = world.sprigs;

        for (let i = 0; i < p.CAPACITY; i++) {
            if (p.active[i]) {
                p.life[i] -= dt;
                if (p.life[i] <= 0) {
                    p.remove(i);
                    continue;
                }

                if (p.ownerId[i] !== -1) {
                    // Attached
                    const owner = p.ownerId[i];
                    if (sprigs.active[owner]) {
                        p.x[i] = sprigs.x[owner];
                        p.y[i] = sprigs.y[owner] - 20; // Float above head
                    } else {
                        // Owner died, particle dies
                        p.remove(i);
                    }
                } else {
                    // Independent physics
                    p.x[i] += p.vx[i] * dt;
                    p.y[i] += p.vy[i] * dt;
                }
            }
        }
    }

    public static spawnFloatingText(world: WorldState, x: number, y: number, text: string, color: number) {
        const id = world.particles.spawn(x, y, ParticleType.TEXT, 1.5); // 1.5s life
        if (id !== -1) {
            world.particles.color[id] = color;
            world.particles.vy[id] = -20; // Float up
            world.particles.textContent.set(id, text);
        }
    }

    public static spawnEmote(world: WorldState, ownerId: number, iconChar: string) {
        const id = world.particles.spawn(0, 0, ParticleType.ICON, 3.0);
        if (id !== -1) {
            world.particles.ownerId[id] = ownerId;
            world.particles.textContent.set(id, iconChar);
            world.particles.scale[id] = 1.5;
        }
    }

    public static spawnCombatFX(world: WorldState, x: number, y: number) {
        // Flash (Circle)
        const flash = world.particles.spawn(x, y, ParticleType.CIRCLE, 0.2);
        if (flash !== -1) {
            world.particles.color[flash] = 0xFFFFFF;
            world.particles.scale[flash] = 2.0; 
        }

        // Sparks
        for(let i=0; i<4; i++) {
            const spark = world.particles.spawn(x, y, ParticleType.SPARK, 0.4);
            if (spark !== -1) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 50 + Math.random() * 50;
                world.particles.vx[spark] = Math.cos(angle) * speed;
                world.particles.vy[spark] = Math.sin(angle) * speed;
                world.particles.color[spark] = 0xFFFF00;
            }
        }
    }

    public static spawnFootprint(world: WorldState, x: number, y: number) {
        const id = world.particles.spawn(x, y, ParticleType.CIRCLE, 5.0);
        if (id !== -1) {
            world.particles.color[id] = 0x000000;
            world.particles.scale[id] = 0.5;
            // No velocity (stationary)
        }
    }
}
