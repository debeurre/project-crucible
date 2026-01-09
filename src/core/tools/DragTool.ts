import { Tool } from './Tool';
import { WorldState } from '../../core/WorldState';
import { CONFIG } from '../Config';

export class DragTool implements Tool {
    private draggedID: number = -1;

    public onDown(world: WorldState, x: number, y: number): void {
        const id = world.sprigs.getSprigAt(x, y, CONFIG.SPRIG_RADIUS * 3); // Larger hit area
        if (id !== -1) {
            this.draggedID = id;
            world.sprigs.vx[id] = 0;
            world.sprigs.vy[id] = 0;
            console.log(`Grabbed Sprig ${id}`);
        }
    }

    public onDrag(world: WorldState, x: number, y: number): void {
        if (this.draggedID !== -1) {
            world.sprigs.x[this.draggedID] = x;
            world.sprigs.y[this.draggedID] = y;
            world.sprigs.vx[this.draggedID] = 0;
            world.sprigs.vy[this.draggedID] = 0;
        }
    }

    public onUp(_world: WorldState, _x: number, _y: number): void {
        if (this.draggedID !== -1) {
            console.log(`Dropped Sprig ${this.draggedID}`);
            this.draggedID = -1;
        }
    }
}
