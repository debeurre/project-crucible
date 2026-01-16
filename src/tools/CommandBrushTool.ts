import { Tool } from './Tool';
import { WorldState } from '../core/WorldState';
import { SprigState } from '../data/SprigState';
import { CONFIG } from '../core/Config';

export class CommandBrushTool implements Tool {
    private isSelecting: boolean = false;
    private isCommanding: boolean = false;
    private startX: number = 0;
    private startY: number = 0;
    private pathEndX: number = 0;
    private pathEndY: number = 0;

    public onDown(world: WorldState, x: number, y: number): void {
        // Phase 1: Selection
        if (!this.hasSelection(world)) {
            // Check for tap on empty terrain vs tap on sprigs
            // For now, let's implement the drag selection
            this.isSelecting = true;
            this.startX = x;
            this.startY = y;
            return;
        }

        // Phase 2: Command
        // Check if tapping existing path to cancel?
        // Let's stick to the prompt: Drag again to draw path.
        this.isCommanding = true;
        this.pathEndX = x;
        this.pathEndY = y;
    }

    public onDrag(world: WorldState, x: number, y: number): void {
        if (this.isSelecting) {
            // Select sprigs under brush
            this.selectInRadius(world, x, y, CONFIG.BRUSH_RADIUS);
        } else if (this.isCommanding) {
            this.pathEndX = x;
            this.pathEndY = y;
        }
    }

    public onUp(world: WorldState, x: number, y: number): void {
        if (this.isSelecting) {
            this.isSelecting = false;
            // If tap without moving, select under cursor
            if (Math.abs(x - this.startX) < 5 && Math.abs(y - this.startY) < 5) {
                 this.selectInRadius(world, x, y, CONFIG.BRUSH_RADIUS);
            }
        } else if (this.isCommanding) {
            this.isCommanding = false;
            // Issue Order to the final drag position
            this.issueMoveOrder(world, this.pathEndX, this.pathEndY);
        }
    }

    private selectInRadius(world: WorldState, x: number, y: number, radius: number) {
        const sprigs = world.sprigs;
        const rSq = radius * radius;
        for (let i = 0; i < sprigs.active.length; i++) {
            if (sprigs.active[i]) {
                const dx = sprigs.x[i] - x;
                const dy = sprigs.y[i] - y;
                if (dx*dx + dy*dy < rSq) {
                    sprigs.selected[i] = 1;
                }
            }
        }
    }

    private hasSelection(world: WorldState): boolean {
        const sprigs = world.sprigs;
        for (let i = 0; i < sprigs.active.length; i++) {
            if (sprigs.active[i] && sprigs.selected[i]) return true;
        }
        return false;
    }

    private issueMoveOrder(world: WorldState, x: number, y: number) {
        const sprigs = world.sprigs;
        for (let i = 0; i < sprigs.active.length; i++) {
            if (sprigs.active[i] && sprigs.selected[i]) {
                // Clear Job
                if (sprigs.jobId[i] !== -1) {
                    world.jobs.unassign(sprigs.jobId[i]);
                    sprigs.jobId[i] = -1;
                }
                
                // Set State
                sprigs.state[i] = SprigState.FORCED_MARCH;
                sprigs.targetX[i] = x;
                sprigs.targetY[i] = y;
                
                // Deselect after command? Prompt implies "free sprigs of orders" on cancel.
                // Usually RTS deselects after move, but let's keep selection for multi-move?
                // Prompt: "Tap once to select... Tap empty terrain to cancel selection."
                // So selection persists.
            }
        }
    }
}
