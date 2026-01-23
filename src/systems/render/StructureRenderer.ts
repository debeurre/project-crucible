import { Graphics } from 'pixi.js';
import { WorldState } from '../../core/WorldState';
import { CONFIG } from '../../core/Config';
import { getStructureStats, StructureType } from '../../data/StructureData';

export class StructureRenderer {
    public draw(g: Graphics, world: WorldState) {
        g.clear();
        for (const s of world.structures) {
            const stats = getStructureStats(s.type);
            const color = stats.color;
            const radius = stats.radius;
            
            if (stats.shape === 'DIAMOND') {
                g.moveTo(s.x, s.y - radius)
                 .lineTo(s.x + radius, s.y)
                 .lineTo(s.x, s.y + radius)
                 .lineTo(s.x - radius, s.y)
                 .closePath()
                 .fill(color);
            } else if (s.type === StructureType.SIGNAL_HARVEST) {
                g.circle(s.x, s.y, radius).fill({ color, alpha: CONFIG.SIGNAL_ALPHA });
                g.moveTo(s.x, s.y + 10).lineTo(s.x, s.y - 20).stroke({ width: 2, color: 0xFFFFFF });
                g.moveTo(s.x, s.y - 20).lineTo(s.x + 15, s.y - 12).lineTo(s.x, s.y - 5).closePath().fill(color);
            } else if (s.type === StructureType.BURROW) {
                g.circle(s.x, s.y, radius).fill(color);
                g.circle(s.x, s.y, radius * 0.6).fill(0x000000); // Entrance hole
            } else if (s.type === StructureType.SIGNAL_PATROL) {
                // Area Indicator
                g.circle(s.x, s.y, radius).fill({ color, alpha: CONFIG.SIGNAL_ALPHA });
                // Red Pennant
                g.moveTo(s.x, s.y + 10).lineTo(s.x, s.y - 20).stroke({ width: 2, color: 0xFFFFFF });
                g.moveTo(s.x, s.y - 20).lineTo(s.x + 15, s.y - 12).lineTo(s.x, s.y - 5).closePath().fill(0xFF0000);
            } else {
                g.circle(s.x, s.y, radius).fill(color);
                
                // Bush Berries
                if (s.type === StructureType.BUSH && s.stock) {
                    const count = s.stock.count('FOOD');
                    const berryCount = Math.floor(count / CONFIG.REGEN_AMOUNT);
                    for (let i = 0; i < berryCount; i++) {
                        const angle = (i / (s.stock.capacityLimit / CONFIG.REGEN_AMOUNT)) * Math.PI * 2;
                        const dist = radius * 0.6;
                        const bx = s.x + Math.cos(angle) * dist;
                        const by = s.y + Math.sin(angle) * dist;
                        g.circle(bx, by, 3).fill(0xFF69B4); // Pink berries
                    }
                }
            }

            this.drawProgressBars(g, s);
        }
    }

    private drawProgressBars(g: Graphics, s: any) {
        const radius = getStructureStats(s.type).radius;
        if (s.type === StructureType.NEST && s.spawnTimer && s.spawnTimer > 0) {
            const progress = s.spawnTimer / CONFIG.SPAWN_TIME;
            this.drawBar(g, s.x, s.y - radius - 15, 40, 6, progress, 0x00FF00);
        }
        if (s.type === StructureType.BUSH && s.regenTimer && s.regenTimer > 0) {
            const progress = s.regenTimer / CONFIG.REGEN_INTERVAL;
            this.drawBar(g, s.x, s.y - radius - 10, 30, 4, progress, 0x00FFFF);
        }
    }

    private drawBar(g: Graphics, x: number, y: number, w: number, h: number, p: number, color: number) {
        g.rect(x - w / 2, y, w, h).fill(0x000000);
        g.rect(x - w / 2 + 1, y + 1, (w - 2) * p, h - 2).fill(color);
    }
}
