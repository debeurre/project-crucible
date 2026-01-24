import { WorldState } from '../core/WorldState';
import { ParticleType } from '../data/ParticleData';
import { CONFIG } from '../core/Config';

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

    public static spawnFloatingText(world: WorldState, x: number, y: number, text: string, color: number, size: number = CONFIG.TEXT_SIZE_SMALL) {
        const id = world.particles.spawn(x, y, ParticleType.TEXT, 1.5); // 1.5s life
        if (id !== -1) {
            world.particles.color[id] = color;
            world.particles.vy[id] = -20; // Float up
            world.particles.textContent.set(id, text);
            world.particles.scale[id] = size; // Storing size directly
        }
    }

    public static spawnEmote(world: WorldState, ownerId: number, iconChar: string) {
        const id = world.particles.spawn(0, 0, ParticleType.ICON, 3.0);
        if (id !== -1) {
            world.particles.ownerId[id] = ownerId;
            world.particles.textContent.set(id, iconChar);
            world.particles.scale[id] = CONFIG.PARTICLE_SIZE_EMOTE;
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
                world.particles.color[spark] = CONFIG.COLOR_PARTICLE_SPARK;
            }
        }
    }

    public static spawnLevelUpFX(world: WorldState, x: number, y: number) {
        // Multi-stage Flash (Bloom)
        for (let i = 0; i < 3; i++) {
            const flash = world.particles.spawn(x, y, ParticleType.CIRCLE, 0.3 + i * 0.1);
            if (flash !== -1) {
                world.particles.color[flash] = CONFIG.COLOR_PARTICLE_GOLD;
                world.particles.scale[flash] = 2.0 + i * 2.0; 
            }
        }

        // Sparks (Yellow, Red, Blue) - High Density
        const colors = [CONFIG.COLOR_PARTICLE_SPARK, 0xFF0000, 0x0000FF];
        for(let i=0; i<48; i++) {
            const spark = world.particles.spawn(x, y, ParticleType.SPARK, 0.5 + Math.random() * 1.0);
            if (spark !== -1) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 40 + Math.random() * 160;
                world.particles.vx[spark] = Math.cos(angle) * speed;
                world.particles.vy[spark] = Math.sin(angle) * speed;
                world.particles.color[spark] = colors[i % colors.length];
            }
        }
    }

    public static spawnFootprint(world: WorldState, x: number, y: number) {
        const id = world.particles.spawn(x, y, ParticleType.CIRCLE, CONFIG.PARTICLE_FOOTPRINT_LIFE);
        if (id !== -1) {
            world.particles.color[id] = 0x000000;
            world.particles.scale[id] = 0.5;
            // No velocity (stationary)
        }
    }
}
