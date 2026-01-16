import { WorldState } from '../core/WorldState';
import { CONFIG } from '../core/Config';
import { StructureType, createStructure } from '../data/StructureData';

export class LifecycleSystem {
    public update(world: WorldState, dt: number) {
        this.updateHunger(world, dt);
        this.updateSpawning(world, dt);
        this.updateRegeneration(world, dt);
    }

    private updateHunger(world: WorldState, dt: number) {
        const sprigs = world.sprigs;
        const structures = world.structures;

        for (let i = 0; i < sprigs.active.length; i++) {
            if (sprigs.active[i] === 0) continue;

            sprigs.feedTimer[i] -= dt;

            if (sprigs.feedTimer[i] <= 0) {
                // Time to eat
                let fed = false;
                const homeId = sprigs.homeID[i];
                if (homeId !== -1) {
                    const nest = structures.find(s => s.id === homeId);
                    if (nest && nest.stock && nest.stock.count('FOOD') >= 1) {
                        nest.stock.remove('FOOD', 1);
                        fed = true;
                    }
                }

                if (fed) {
                    // Reset to Satisfied
                    sprigs.feedTimer[i] = CONFIG.HUNGER_INTERVAL;
                    sprigs.starvationState[i] = 0;
                    sprigs.speed[i] = CONFIG.MAX_SPEED;
                } else {
                    // Failed to eat
                    if (sprigs.starvationState[i] === 0) {
                        // Enter Brownout
                        sprigs.starvationState[i] = 1;
                        sprigs.feedTimer[i] = CONFIG.HUNGER_INTERVAL; // Give another cycle before death
                        sprigs.speed[i] = CONFIG.MAX_SPEED * 0.5;
                        // Cap carry capacity? Logic is in JobExecution, but we can't easily change capacity there dynamically without checks.
                        // For now, speed reduction is key.
                    } else if (sprigs.starvationState[i] === 1) {
                        // Death
                        this.killSprig(world, i);
                    }
                }
            }
        }
    }

    private killSprig(world: WorldState, i: number) {
        const sprigs = world.sprigs;
        sprigs.active[i] = 0;
        world.sprigs.count--;
        
        // Drop Inventory as Crumb
        const food = sprigs.stock[i].count('FOOD');
        if (food > 0) {
            // Find existing crumb or create new?
            // Simple: Create a crumb
            const crumb = createStructure(StructureType.CRUMB, sprigs.x[i], sprigs.y[i]);
            crumb.id = world.nextStructureId++;
            crumb.stock!.remove('FOOD', 50); // Reset default
            crumb.stock!.add('FOOD', food);
            
            world.structures.push(crumb);
            world.structureHash.add(crumb);
        }
    }

    private updateSpawning(world: WorldState, dt: number) {
        for (const s of world.structures) {
            if (s.type === StructureType.NEST && s.stock) {
                if (s.stock.count('FOOD') >= CONFIG.SPAWN_COST) {
                    if (s.spawnTimer === undefined) s.spawnTimer = 0;
                    s.spawnTimer += dt;
                    
                    if (s.spawnTimer >= CONFIG.SPAWN_TIME) {
                        if (s.stock.remove('FOOD', CONFIG.SPAWN_COST)) {
                            // Spawn
                            const angle = Math.random() * Math.PI * 2;
                            const dist = 20.0;
                            const sx = s.x + Math.cos(angle) * dist;
                            const sy = s.y + Math.sin(angle) * dist;
                            world.sprigs.spawn(sx, sy);
                        }
                        s.spawnTimer = 0;
                    }
                } else {
                    s.spawnTimer = 0;
                }
            }
        }
    }

    private updateRegeneration(world: WorldState, dt: number) {
        for (const s of world.structures) {
            // Check for regeneration eligibility
            // For now, let's assume Cookies regenerate
            if (s.type === StructureType.COOKIE && s.stock) {
                if (s.regenTimer === undefined) s.regenTimer = 0;

                const capacity = s.stock.capacityLimit;
                
                // If we can't check capacity easily, we can just check if stock < 500
                if (s.stock.count('FOOD') < capacity) {
                    s.regenTimer += dt;
                    if (s.regenTimer >= CONFIG.REGEN_INTERVAL) {
                        s.stock.add('FOOD', CONFIG.REGEN_AMOUNT);
                        s.regenTimer = 0;
                    }
                }
            }
        }
    }
}