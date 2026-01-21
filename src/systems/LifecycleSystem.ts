import { WorldState } from '../core/WorldState';
import { CONFIG } from '../core/Config';
import { StructureType, createStructure } from '../data/StructureData';

import { EntityType } from '../data/EntityData';

export class LifecycleSystem {
    public update(world: WorldState, dt: number) {
        this.updateHunger(world, dt);
        this.updateSpawning(world, dt);
        this.updateRegeneration(world, dt);
        this.updatePaths(world);
    }

    private updatePaths(world: WorldState) {
        const paths = world.paths;
        const sprigs = world.sprigs;
        const activePathIndices = new Set<number>();

        for (let i = 0; i < sprigs.active.length; i++) {
            if (sprigs.active[i] && sprigs.state[i] === 5) { // FORCED_MARCH
                if (sprigs.pathId[i] !== -1) {
                    activePathIndices.add(sprigs.pathId[i]);
                }
            }
        }

        for (let p = 0; p < 10; p++) {
            if (paths.active[p] && !activePathIndices.has(p)) {
                paths.remove(p);
            }
        }
    }

    private updateHunger(world: WorldState, dt: number) {
        const sprigs = world.sprigs;
        const structures = world.structures;

        for (let i = 0; i < sprigs.active.length; i++) {
            if (sprigs.active[i] === 0 || sprigs.type[i] === EntityType.THIEF) continue;

            sprigs.feedTimer[i] -= dt;

            if (sprigs.feedTimer[i] <= 0) {
                // Time to eat
                const homeId = sprigs.homeID[i];
                let fed = false;
                let dying = false;

                // 1. Eat from SELF first
                if (sprigs.stock[i].count('FOOD') >= 1) {
                    sprigs.stock[i].remove('FOOD', 1);
                    fed = true;
                } 
                // 2. Eat from Nest
                else if (homeId !== -1) {
                    const nest = structures.find(s => s.id === homeId);
                    if (nest && nest.stock) {
                        const food = nest.stock.count('FOOD');
                        
                        if (food > 0) {
                            nest.stock.remove('FOOD', 1);
                            fed = true;
                        } else {
                            // No Food -> Risk Death
                            if (Math.random() < CONFIG.HUNGER_RISK) {
                                dying = true;
                            }
                        }
                    } else {
                         dying = true;
                    }
                } else {
                    dying = true;
                }

                if (dying) {
                    this.killSprig(world, i);
                } else {
                    // Reset Timer
                    sprigs.feedTimer[i] = CONFIG.HUNGER_INTERVAL;
                    
                    if (fed) {
                        // Sated (Normal Green)
                        sprigs.hungerState[i] = 0;
                        sprigs.speed[i] = CONFIG.MAX_SPEED;
                    } else {
                        // Starving (increment hunger state)
                        if (sprigs.hungerState[i] < 2) {
                             sprigs.hungerState[i]++;
                             sprigs.speed[i] = CONFIG.MAX_SPEED * CONFIG.HUNGER_PENALTY;
                        } else {
                             // Missed 3rd meal -> Die
                             this.killSprig(world, i);
                        }
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
            if ((s.type === StructureType.COOKIE || s.type === StructureType.BUSH) && s.stock) {
                if (s.regenTimer === undefined) s.regenTimer = 0;

                const capacity = s.stock.capacityLimit;
                
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