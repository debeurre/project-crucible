import { Graphics } from 'pixi.js';
import { WorldState } from '../../core/WorldState';

export class PathRenderer {
    public draw(g: Graphics, world: WorldState) {
        const paths = world.paths;
        const MAX_PATHS = 10;
        const MAX_POINTS = 100;

        for (let p = 0; p < MAX_PATHS; p++) {
            if (paths.active[p] === 0) continue;

            const count = paths.pointsCount[p];
            const offset = p * MAX_POINTS;

            for (let i = 0; i < count; i++) {
                const px = paths.pointsX[offset + i];
                const py = paths.pointsY[offset + i];
                const size = 4 * (1 - i / count) + 1;
                
                g.circle(px, py, size).fill({ color: 0x00FF00, alpha: 0.5 });
                
                if (i > 0) {
                    const prevX = paths.pointsX[offset + i - 1];
                    const prevY = paths.pointsY[offset + i - 1];
                    g.moveTo(prevX, prevY).lineTo(px, py).stroke({ width: size, color: 0x00FF00, alpha: 0.3 });
                }
            }
        }
    }
}
