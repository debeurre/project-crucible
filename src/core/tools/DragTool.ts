import { Tool } from './Tool';
import { WorldState } from '../../core/WorldState';
import { CONFIG } from '../Config';
import { getStructureStats } from '../../data/StructureData';

export class DragTool implements Tool {
    private draggedID: number = -1;
    private draggedType: 'SPRIG' | 'STRUCTURE' | 'NONE' = 'NONE';
    private structureIndex: number = -1;

    public onDown(world: WorldState, x: number, y: number): void {
        // 1. Try to grab a Sprig
        const sprigId = world.sprigs.getSprigAt(x, y, CONFIG.SPRIG_RADIUS * 3);
        if (sprigId !== -1) {
            this.draggedID = sprigId;
            this.draggedType = 'SPRIG';
            world.sprigs.vx[sprigId] = 0;
            world.sprigs.vy[sprigId] = 0;
            console.log(`Grabbed Sprig ${sprigId}`);
            return;
        }

        // 2. Try to grab a Structure
        for (let i = 0; i < world.structures.length; i++) {
            const s = world.structures[i];
            const stats = getStructureStats(s.type);
            const dx = s.x - x;
            const dy = s.y - y;
            if (dx * dx + dy * dy < stats.radius * stats.radius) {
                this.draggedID = s.id;
                this.structureIndex = i;
                this.draggedType = 'STRUCTURE';
                console.log(`Grabbed Structure ${s.id} (${s.type})`);
                return;
            }
        }
    }

    public onDrag(world: WorldState, x: number, y: number): void {
        if (this.draggedType === 'SPRIG' && this.draggedID !== -1) {
            world.sprigs.x[this.draggedID] = x;
            world.sprigs.y[this.draggedID] = y;
            world.sprigs.vx[this.draggedID] = 0;
            world.sprigs.vy[this.draggedID] = 0;
        } else if (this.draggedType === 'STRUCTURE' && this.structureIndex !== -1) {
            const s = world.structures[this.structureIndex];
            if (s && s.id === this.draggedID) {
                s.x = x;
                s.y = y;
            }
        }
    }

    public onUp(_world: WorldState, _x: number, _y: number): void {
        if (this.draggedType !== 'NONE') {
            console.log(`Dropped ${this.draggedType}`);
            this.draggedID = -1;
            this.structureIndex = -1;
            this.draggedType = 'NONE';
        }
    }
}