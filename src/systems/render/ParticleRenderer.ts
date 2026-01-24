import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { WorldState } from '../../core/WorldState';
import { ParticleType } from '../../data/ParticleData';

export class ParticleRenderer {
    private texts: Map<number, Text> = new Map();

    public update(container: Container, g: Graphics, world: WorldState) {
        g.clear();
        const p = world.particles;

        // Cleanup dead texts
        for (const [id, text] of this.texts) {
            if (!p.active[id] || (p.type[id] !== ParticleType.TEXT && p.type[id] !== ParticleType.ICON)) {
                container.removeChild(text);
                text.destroy();
                this.texts.delete(id);
            }
        }

        for (let i = 0; i < p.CAPACITY; i++) {
            if (p.active[i]) {
                const alpha = p.life[i] / p.maxLife[i];
                const x = p.x[i];
                const y = p.y[i];
                const scale = p.scale[i];
                const color = p.color[i];

                if (p.type[i] === ParticleType.CIRCLE) {
                    g.circle(x, y, 10 * scale).fill({ color, alpha }); // 10 base radius
                } else if (p.type[i] === ParticleType.SPARK) {
                    // Line trail
                    g.moveTo(x, y).lineTo(x - p.vx[i] * 0.1, y - p.vy[i] * 0.1).stroke({ width: 2, color, alpha });
                } else if (p.type[i] === ParticleType.TEXT || p.type[i] === ParticleType.ICON) {
                    let text = this.texts.get(i);
                    if (!text) {
                        const style = new TextStyle({
                            fontFamily: 'monospace',
                            fontSize: p.type[i] === ParticleType.ICON ? 24 : 14,
                            fill: color,
                            stroke: { color: '#000000', width: 2 },
                            dropShadow: {
                                alpha: 0.5,
                                blur: 1,
                                distance: 1
                            }
                        });
                        text = new Text({ text: p.textContent.get(i) || '', style });
                        text.anchor.set(0.5);
                        container.addChild(text);
                        this.texts.set(i, text);
                    }
                    
                    text.x = x;
                    text.y = y;
                    text.alpha = alpha;
                    text.scale.set(scale);
                }
            }
        }
    }
}
