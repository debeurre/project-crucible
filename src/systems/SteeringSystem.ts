import { WorldState } from '../core/WorldState';
import { CONFIG } from '../core/Config';
import { SpatialHash } from '../core/SpatialHash';
import { SprigState } from '../data/SprigState';
import { SteeringBehaviors } from './steering/SteeringBehaviors';

import { EntityType } from '../data/EntityData';

export class SteeringSystem {
    public update(world: WorldState) {
        if (!world.spatialHash) world.spatialHash = new SpatialHash(CONFIG.GRID_SIZE * 2);
        const sprigs = world.sprigs;
        world.spatialHash.update(sprigs);

        for (let i = 0; i < sprigs.active.length; i++) {
            if (sprigs.active[i] === 0 || sprigs.type[i] === EntityType.THIEF) continue;

            const x = sprigs.x[i];
            const y = sprigs.y[i];
            let ax = 0, ay = 0;

            // 1. FORCED MARCH (Path Following)
            if (sprigs.state[i] === SprigState.FORCED_MARCH) {
                this.handleForcedMarch(world, i);
                continue;
            }

            // 2. SEEK
            const seek = SteeringBehaviors.seek(i, sprigs, sprigs.targetX[i], sprigs.targetY[i], CONFIG.STEER_SEEK_WEIGHT);
            ax += seek.ax; ay += seek.ay;

            // 3. AVOIDANCE (Rocks)
            const avoid = SteeringBehaviors.avoidStructures(i, sprigs, world.structures);
            
            // Cumulative Decay Logic for Avoidance
            sprigs.avoidAx[i] *= 0.7;
            sprigs.avoidAy[i] *= 0.7;
            if (avoid.ax !== 0 || avoid.ay !== 0) {
                sprigs.avoidAx[i] += avoid.ax * 0.2;
                sprigs.avoidAy[i] += avoid.ay * 0.2;
            }
            ax += sprigs.avoidAx[i];
            ay += sprigs.avoidAy[i];

            // 4. NEIGHBORS
            const neighbors = world.spatialHash.query(x, y, 40);
            const sep = SteeringBehaviors.separate(i, sprigs, neighbors, 40, CONFIG.STEER_SEPARATION_WEIGHT);
            ax += sep.ax; ay += sep.ay;

            // 5. COHESION
            const coh = this.calculateCohesion(i, sprigs, neighbors);
            ax += coh.ax; ay += coh.ay;

            sprigs.ax[i] = ax;
            sprigs.ay[i] = ay;
        }
    }

    private handleForcedMarch(world: WorldState, i: number) {
        const sprigs = world.sprigs;
        const pathId = sprigs.pathId[i];
        let tx = sprigs.targetX[i], ty = sprigs.targetY[i];

        if (pathId !== -1 && world.paths.active[pathId]) {
            const p = world.paths.getPoint(pathId, sprigs.pathTargetIdx[i]);
            if (p) { tx = p.x; ty = p.y; }
        }

        const dx = tx - sprigs.x[i], dy = ty - sprigs.y[i];
        const distSq = dx*dx + dy*dy;

        if (distSq > CONFIG.WAYPOINT_TOLERANCE * CONFIG.WAYPOINT_TOLERANCE) {
            const seek = SteeringBehaviors.seek(i, sprigs, tx, ty, CONFIG.STEER_PATH_WEIGHT);
            sprigs.ax[i] = seek.ax;
            sprigs.ay[i] = seek.ay;
        } else {
            if (pathId !== -1 && world.paths.active[pathId]) {
                sprigs.pathTargetIdx[i]++;
                if (sprigs.pathTargetIdx[i] >= world.paths.pointsCount[pathId]) {
                    sprigs.state[i] = SprigState.IDLE;
                    sprigs.pathId[i] = -1;
                } else {
                    const nextP = world.paths.getPoint(pathId, sprigs.pathTargetIdx[i]);
                    if (nextP) { sprigs.targetX[i] = nextP.x; sprigs.targetY[i] = nextP.y; }
                }
            } else {
                sprigs.state[i] = SprigState.IDLE;
            }
        }

        // Forced March Separation
        const neighbors = world.spatialHash.query(sprigs.x[i], sprigs.y[i], 30);
        const sep = SteeringBehaviors.separate(i, sprigs, neighbors, 30, CONFIG.STEER_SEPARATION_WEIGHT);
        sprigs.ax[i] += sep.ax;
        sprigs.ay[i] += sep.ay;
    }

    private calculateCohesion(i: number, sprigs: any, neighbors: number[]): {ax: number, ay: number} {
        let cohX = 0, cohY = 0, count = 0;
        for (const nIdx of neighbors) {
            if (nIdx === i) continue;
            cohX += sprigs.x[nIdx];
            cohY += sprigs.y[nIdx];
            count++;
        }
        if (count > 0) {
            cohX /= count; cohY /= count;
            const dx = cohX - sprigs.x[i], dy = cohY - sprigs.y[i];
            const dist = Math.sqrt(dx*dx + dy*dy) || 1;
            const desX = (dx / dist) * sprigs.speed[i];
            const desY = (dy / dist) * sprigs.speed[i];
            return {
                ax: (desX - sprigs.vx[i]) * CONFIG.STEER_COHESION_WEIGHT,
                ay: (desY - sprigs.vy[i]) * CONFIG.STEER_COHESION_WEIGHT
            };
        }
        return { ax: 0, ay: 0 };
    }
}
