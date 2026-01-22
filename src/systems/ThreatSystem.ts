import { WorldState } from '../core/WorldState';
import { StructureType, createStructure, getStructureStats } from '../data/StructureData';
import { EntityType } from '../data/EntityData';
import { CONFIG } from '../core/Config';

const THIEF_STATE = {
    SEEK_LOOT: 0,
    FLEE: 1,
    DECISION: 2
};

export class ThreatSystem {
    private frameCount: number = 0;

    public update(world: WorldState) {
        this.frameCount++;
        
        // Part A: Shadow Spawning Logic (Every 60 frames)
        if (this.frameCount % 60 === 0) {
            this.handleSpawning(world);
        }

        // Part B: Thief AI Loop
        this.updateThieves(world);
    }

    private handleSpawning(world: WorldState) {
        // Limit Burrows
        let burrowCount = 0;
        for (const st of world.structures) {
            if (st.type === StructureType.BURROW) burrowCount++;
        }
        if (burrowCount >= CONFIG.MAX_BURROWS) return;

        // Trigger: Check wealth
        let wealthyNest = null;
        for (const s of world.structures) {
            if (s.type === StructureType.NEST && s.stock && s.stock.count('FOOD') > 20) {
                wealthyNest = s;
                break;
            }
        }

        if (!wealthyNest) return;

        // Positioning
        // Prompt says: Nest.visionRadius + 50. Config says NEST_VIEW_RADIUS = 400. So 450.
        const spawnDist = CONFIG.NEST_VIEW_RADIUS + 50;
        const angle = Math.random() * Math.PI * 2;
        const sx = wealthyNest.x + Math.cos(angle) * spawnDist;
        const sy = wealthyNest.y + Math.sin(angle) * spawnDist;

        // Validation (Blind Spot)
        const nearby = world.spatialHash.query(sx, sy, 50);
        let hasSprigs = false;
        for (const id of nearby) {
            if (world.sprigs.active[id] && world.sprigs.type[id] === EntityType.SPRIG) {
                hasSprigs = true;
                break;
            }
        }

        if (hasSprigs) return; // Abort

        // Spawn Burrow
        const burrow = createStructure(StructureType.BURROW, sx, sy);
        burrow.id = world.nextStructureId++;
        burrow.stock!.add('FOOD', 0); // Initialize stock tracking
        world.structures.push(burrow);
        world.structureHash.add(burrow);

        // Spawn Thief
        const thiefId = world.sprigs.spawn(sx, sy, EntityType.THIEF);
        if (thiefId !== -1) {
            world.sprigs.hp[thiefId] = CONFIG.THIEF_HP;
            world.sprigs.maxHp[thiefId] = CONFIG.THIEF_HP;
            world.sprigs.prevHp[thiefId] = CONFIG.THIEF_HP;
            world.sprigs.attack[thiefId] = CONFIG.THIEF_ATTACK;
            world.sprigs.defense[thiefId] = CONFIG.THIEF_DEFENSE;
            world.sprigs.speed[thiefId] = CONFIG.MAX_SPEED * CONFIG.THIEF_SPEED_MULT;
            world.sprigs.homeID[thiefId] = burrow.id; // Store burrow ID as home
            world.sprigs.state[thiefId] = THIEF_STATE.SEEK_LOOT; // Reuse state array for thief state
            
            // Set Thief Capacity to 10
            world.sprigs.stock[thiefId].setCapacity(10);
        }
    }

    private updateThieves(world: WorldState) {
        const sprigs = world.sprigs;
        const structures = world.structures;

        for (let i = 0; i < sprigs.active.length; i++) {
            if (sprigs.active[i] === 0 || sprigs.type[i] !== EntityType.THIEF) continue;

            // Death Check
            if (sprigs.hp[i] <= 0) {
                // Die
                const loot = sprigs.stock[i].count('FOOD');
                if (loot > 0) {
                    // Spawn Loose Food (Crumb)
                    const crumb = createStructure(StructureType.CRUMB, sprigs.x[i], sprigs.y[i]);
                    crumb.id = world.nextStructureId++;
                    crumb.stock!.remove('FOOD', 50);
                    crumb.stock!.add('FOOD', loot);
                    world.structures.push(crumb);
                    world.structureHash.add(crumb);
                }
                sprigs.active[i] = 0;
                world.sprigs.count--;
                continue;
            }

            // Damage Reaction
            if (sprigs.hp[i] < sprigs.prevHp[i]) {
                // Took Damage!
                const loot = sprigs.stock[i].count('FOOD');
                if (loot > 0) {
                    sprigs.stock[i].remove('FOOD', loot);
                    // Spawn Loose Food (Crumb)
                    const crumb = createStructure(StructureType.CRUMB, sprigs.x[i], sprigs.y[i]);
                    crumb.id = world.nextStructureId++;
                    crumb.stock!.remove('FOOD', 50);
                    crumb.stock!.add('FOOD', loot);
                    world.structures.push(crumb);
                    world.structureHash.add(crumb);
                }
                sprigs.state[i] = THIEF_STATE.FLEE;
            }
            sprigs.prevHp[i] = sprigs.hp[i]; // Update history

            const x = sprigs.x[i];
            const y = sprigs.y[i];
            const state = sprigs.state[i];

            if (state === THIEF_STATE.SEEK_LOOT) {
                // Find target
                let target = null;
                let minDistSq = Infinity;

                const burrowId = sprigs.homeID[i];
                const burrow = structures.find(s => s.id === burrowId);
                if (!burrow) {
                    sprigs.active[i] = 0;
                    world.sprigs.count--;
                    continue;
                }

                // Simple linear scan for loot (optimize later)
                for (const s of structures) {
                    if ((s.type === StructureType.NEST || s.type === StructureType.COOKIE || s.type === StructureType.CRUMB || s.type === StructureType.BUSH) 
                        && s.stock && s.stock.count('FOOD') > 0) {
                        
                        // Leash Check: Target must be near burrow
                        const bdx = s.x - burrow.x;
                        const bdy = s.y - burrow.y;
                        if (bdx*bdx + bdy*bdy > CONFIG.THIEF_LEASH_RADIUS * CONFIG.THIEF_LEASH_RADIUS) continue;

                        const dx = s.x - x;
                        const dy = s.y - y;
                        const dSq = dx*dx + dy*dy;
                        if (dSq < minDistSq) {
                            minDistSq = dSq;
                            target = s;
                        }
                    }
                }

                if (target) {
                    // Set Target for SteeringSystem
                    sprigs.targetX[i] = target.x;
                    sprigs.targetY[i] = target.y;

                    // Interact
                    const radius = getStructureStats(target.type).radius + 10;
                    if (minDistSq < radius * radius) {
                        // Steal: Calculate amount based on target and capacity
                        const amount = Math.min(10, target.stock!.count('FOOD'));
                        if (amount > 0 && target.stock!.remove('FOOD', amount)) {
                            const added = sprigs.stock[i].add('FOOD', amount);
                            if (added) {
                                sprigs.state[i] = THIEF_STATE.FLEE;
                            } else {
                                // This shouldn't happen if capacity is set to 10
                                console.warn(`Thief [${i}] failed to add food to inventory!`);
                            }
                        }
                    }
                } else {
                    // No loot within leash? Return to burrow
                    sprigs.state[i] = THIEF_STATE.FLEE;
                }

            } else if (state === THIEF_STATE.FLEE) {
                const burrowId = sprigs.homeID[i];
                const burrow = structures.find(s => s.id === burrowId);

                if (burrow) {
                    // Set Target for SteeringSystem
                    sprigs.targetX[i] = burrow.x;
                    sprigs.targetY[i] = burrow.y;

                    const dx = burrow.x - x;
                    const dy = burrow.y - y;
                    const dSq = dx*dx + dy*dy;
                    const radius = getStructureStats(StructureType.BURROW).radius + 10;

                    if (dSq < radius * radius) {
                        // Bank
                        const amount = sprigs.stock[i].count('FOOD');
                        if (burrow.stock) {
                            const success = burrow.stock.add('FOOD', amount);
                            if (success) {
                                console.log(`Thief [${i}] banked ${amount} food into Burrow [${burrow.id}]. New Total: ${burrow.stock.count('FOOD')}`);
                                sprigs.stock[i].remove('FOOD', amount);
                            } else {
                                console.warn(`Thief [${i}] failed to bank food into Burrow [${burrow.id}]. (Capacity: ${burrow.stock.capacityLimit})`);
                            }
                        } else {
                            console.error(`Thief [${i}] attempted to bank into Burrow [${burrow.id}] but it has NO STOCK component!`);
                        }
                        
                        // Decision Point
                        sprigs.state[i] = THIEF_STATE.DECISION;
                    }
                } else {
                    // Burrow destroyed? Panic flee to edge or despawn
                    sprigs.active[i] = 0;
                    world.sprigs.count--;
                }
            } else if (state === THIEF_STATE.DECISION) {
                const burrowId = sprigs.homeID[i];
                const burrow = structures.find(s => s.id === burrowId);

                if (burrow && burrow.stock) {
                    // Check Capacity
                    if (burrow.stock.count('FOOD') >= CONFIG.BURROW_LIMIT) {
                        // Mission Complete
                        sprigs.active[i] = 0;
                        world.sprigs.count--;
                        // Optional: Despawn burrow too? Prompt says "Temporary Burrow"
                        // Leaving it for now as per previous fix
                    } else {
                        // Go again
                        sprigs.state[i] = THIEF_STATE.SEEK_LOOT;
                    }
                } else {
                    // Burrow gone
                    sprigs.active[i] = 0;
                    world.sprigs.count--;
                }
            }
        }
    }
}
