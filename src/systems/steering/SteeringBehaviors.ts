import { EntityData } from '../../data/EntityData';
import { Structure, getStructureStats } from '../../data/StructureData';
import { CONFIG } from '../../core/Config';

export class SteeringBehaviors {
    public static seek(sprigId: number, sprigs: EntityData, tx: number, ty: number, weight: number): {ax: number, ay: number} {
        const dx = tx - sprigs.x[sprigId];
        const dy = ty - sprigs.y[sprigId];
        const distSq = dx * dx + dy * dy;
        
        if (distSq > 1) {
            const dist = Math.sqrt(distSq);
            const SLOWING_RADIUS = 50.0;
            const speed = sprigs.speed[sprigId];
            const desiredSpeed = dist < SLOWING_RADIUS ? speed * (dist / SLOWING_RADIUS) : speed;

            const desireX = (dx / dist) * desiredSpeed;
            const desireY = (dy / dist) * desiredSpeed;
            
            return {
                ax: (desireX - sprigs.vx[sprigId]) * weight,
                ay: (desireY - sprigs.vy[sprigId]) * weight
            };
        }
        return { ax: -sprigs.vx[sprigId], ay: -sprigs.vy[sprigId] };
    }

    public static separate(sprigId: number, sprigs: EntityData, neighbors: number[], radius: number, weight: number): {ax: number, ay: number} {
        let sepX = 0, sepY = 0, count = 0;
        const x = sprigs.x[sprigId];
        const y = sprigs.y[sprigId];

        for (const nIdx of neighbors) {
            if (nIdx === sprigId) continue;
            const nx = sprigs.x[nIdx];
            const ny = sprigs.y[nIdx];
            const dx = x - nx;
            const dy = y - ny;
            const distSq = dx * dx + dy * dy;

            if (distSq > 0 && distSq < radius * radius) {
                const dist = Math.sqrt(distSq);
                
                // Hard Separation
                if (dist < 5.0) {
                    const nudge = (5.0 - dist) * 0.5;
                    sprigs.x[sprigId] += (dx / dist) * nudge;
                    sprigs.y[sprigId] += (dy / dist) * nudge;
                }

                const push = 1.0 / (dist / 10);
                sepX += (dx / dist) * push;
                sepY += (dy / dist) * push;
                count++;
            }
        }

        if (count > 0) {
            const len = Math.sqrt(sepX * sepX + sepY * sepY) || 1;
            const desX = (sepX / len) * sprigs.speed[sprigId];
            const desY = (sepY / len) * sprigs.speed[sprigId];
            
            let fx = (desX - sprigs.vx[sprigId]);
            let fy = (desY - sprigs.vy[sprigId]);

            const MAX_SEP_FORCE = 100.0;
            const fLenSq = fx*fx + fy*fy;
            if (fLenSq > MAX_SEP_FORCE * MAX_SEP_FORCE) {
                const fLen = Math.sqrt(fLenSq);
                fx = (fx / fLen) * MAX_SEP_FORCE;
                fy = (fy / fLen) * MAX_SEP_FORCE;
            }
            return { ax: fx * weight, ay: fy * weight };
        }
        return { ax: 0, ay: 0 };
    }

    public static avoidStructures(sprigId: number, sprigs: EntityData, structures: Structure[]): {ax: number, ay: number} {
        let avoidX = 0, avoidY = 0, count = 0;
        const x = sprigs.x[sprigId];
        const y = sprigs.y[sprigId];
        const buffer = 5.0;

        for (const s of structures) {
            const stats = getStructureStats(s.type);
            if (!stats.solid) continue;

            const dx = x - s.x;
            const dy = y - s.y;
            const distSq = dx*dx + dy*dy;
            const combR = stats.radius + 15.0;
            const checkD = combR + buffer;

            if (distSq < checkD * checkD) {
                const dist = Math.sqrt(distSq) || 0.001;
                const radX = dx / dist;
                const radY = dy / dist;
                const tanX = -radY * (tanDot(radX, radY, sprigs.vx[sprigId], sprigs.vy[sprigId]) > 0 ? 1 : -1);
                const tanY = radX * (tanDot(radX, radY, sprigs.vx[sprigId], sprigs.vy[sprigId]) > 0 ? 1 : -1);

                const weight = Math.max(0, Math.min(1, 1.0 - ((dist - combR) / buffer)));
                avoidX += (radX * 0.6 + tanX * 0.4) * weight;
                avoidY += (radY * 0.6 + tanY * 0.4) * weight;
                count++;
            }
        }

        if (count > 0) {
            const len = Math.sqrt(avoidX*avoidX + avoidY*avoidY) || 1;
            const desX = (avoidX / len) * sprigs.speed[sprigId];
            const desY = (avoidY / len) * sprigs.speed[sprigId];
            return {
                ax: (desX - sprigs.vx[sprigId]) * CONFIG.STEER_AVOID_WEIGHT,
                ay: (desY - sprigs.vy[sprigId]) * CONFIG.STEER_AVOID_WEIGHT
            };
        }
        return { ax: 0, ay: 0 };
    }
}

function tanDot(rx: number, ry: number, vx: number, vy: number): number {
    return (-ry) * vx + (rx) * vy;
}
