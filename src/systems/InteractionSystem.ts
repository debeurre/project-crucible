import { WorldState } from '../core/WorldState';
import { InputState } from '../core/InputState';
import { CONFIG } from '../core/Config';

export class InteractionSystem {
    public update(world: WorldState) {
        // Paint Scent (Any Click/Drag)
        if (InputState.isDown || InputState.isRightDown) {
            if (world.map.scents) {
                const gx = Math.floor(InputState.x / CONFIG.TILE_SIZE);
                const gy = Math.floor(InputState.y / CONFIG.TILE_SIZE);
                
                if (gx >= 0 && gx < world.map.width && gy >= 0 && gy < world.map.height) {
                    const index = gy * world.map.width + gx;
                    world.map.scents[index] = Math.min(1.0, world.map.scents[index] + 1.0);
                }
            }
        }
    }
}
