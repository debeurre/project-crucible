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
                const homeId = sprigs.homeID[i];
                let dying = false;
                let brownout = false;

                if (homeId !== -1) {
                    const nest = structures.find(s => s.id === homeId);
                    if (nest && nest.stock) {
                        const food = nest.stock.count('FOOD');
                        
                        // Count housed sprigs
                        let housed = 0;
                        for(let k=0; k<sprigs.active.length; k++) {
                            if (sprigs.active[k] && sprigs.homeID[k] === homeId) housed++;
                        }

                        const buffer = housed * CONFIG.HUNGER_BUFFER;

                        if (food > 0) {
                            nest.stock.remove('FOOD', 1);
                            
                            // Check for Brownout Condition
                            if (food <= buffer) {
                                brownout = true;
                            }
                        } else {
                            // No Food -> Risk Death
                            if (Math.random() < CONFIG.HUNGER_RISK) {
                                dying = true;
                            } else {
                                // Survived but starving (Brownout)
                                brownout = true;
                            }
                        }
                    } else {
                         // No nest or no stock component? Die.
                         dying = true;
                    }
                } else {
                    // Homeless? Die.
                    dying = true;
                }

                if (dying) {
                    this.killSprig(world, i);
                } else {
                    // Reset Timer
                    sprigs.feedTimer[i] = CONFIG.HUNGER_INTERVAL;
                    
                    if (brownout) {
                        sprigs.starvationState[i] = 1;
                        sprigs.speed[i] = CONFIG.MAX_SPEED * CONFIG.HUNGER_PENALTY;
                    } else {
                        sprigs.starvationState[i] = 0;
                        sprigs.speed[i] = CONFIG.MAX_SPEED;
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
        const sprigs = world.sprigs;
        for (const s of world.structures) {
            if (s.type === StructureType.NEST && s.stock) {
                // Calculate Threshold
                let housed = 0;
                for(let k=0; k<sprigs.active.length; k++) {
                    if (sprigs.active[k] && sprigs.homeID[k] === s.id) housed++;
                }
                
                const threshold = (housed * CONFIG.HUNGER_BUFFER) + CONFIG.SPAWN_COST;

                if (s.stock.count('FOOD') >= threshold) {
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