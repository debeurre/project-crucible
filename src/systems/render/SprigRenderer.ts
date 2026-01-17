import { Container, Sprite, Graphics } from 'pixi.js';
import { WorldState } from '../../core/WorldState';
import { CONFIG } from '../../core/Config';
import { TextureManager } from '../../core/TextureManager';

export class SprigRenderer {
    private sprites: Map<number, Sprite> = new Map();

    public update(container: Container, debugG: Graphics, world: WorldState) {
        const sprigs = world.sprigs;
        const count = CONFIG.MAX_SPRIGS;

        // Cleanup dead
        for (const [id, sprite] of this.sprites) {
            if (sprigs.active[id] === 0) {
                container.removeChild(sprite);
                sprite.destroy();
                this.sprites.delete(id);
            }
        }

        // Update active
        for (let i = 0; i < count; i++) {
            if (sprigs.active[i] === 1) {
                let sprite = this.sprites.get(i);
                if (!sprite) {
                    sprite = new Sprite(TextureManager.sootTexture);
                    sprite.anchor.set(0.5);
                    container.addChild(sprite);
                    this.sprites.set(i, sprite);
                }
                
                sprite.x = sprigs.x[i];
                sprite.y = sprigs.y[i];
                if (Math.abs(sprigs.vx[i]) > 0.01 || Math.abs(sprigs.vy[i]) > 0.01) {
                    sprite.rotation = Math.atan2(sprigs.vy[i], sprigs.vx[i]) + 1.57;
                }
                
                sprite.tint = this.getSprigTint(world, i);
                sprite.scale.set((CONFIG.SPRIG_RADIUS * 2) / 36);

                if (sprigs.selected[i]) {
                    this.drawSelectionArrow(debugG, sprite.x, sprite.y);
                }
            }
        }
    }

    private getSprigTint(world: WorldState, i: number): number {
        const sprigs = world.sprigs;
        const isHauling = sprigs.stock[i].count('FOOD') > 0;
        const hunger = sprigs.hungerState[i];

        if (isHauling) {
            if (hunger === 1) return 0xFF7F50; // Coral
            if (hunger === 2) return 0xFF4500; // OrangeRed
            return 0xFF69B4; // Pink
        }
        if (hunger === 1) return 0xFFA500; // Orange
        if (hunger === 2) return 0xFF4500; // OrangeRed
        return 0x00FF00; // Green
    }

    private drawSelectionArrow(g: Graphics, x: number, y: number) {
        g.moveTo(x, y - 20)
         .lineTo(x - 5, y - 30)
         .lineTo(x + 5, y - 30)
         .closePath()
         .fill(0xFFFF00);
    }
}
