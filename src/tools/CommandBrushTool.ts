import { Tool } from './Tool';
import { WorldState } from '../core/WorldState';
import { SprigState } from '../data/SprigState';
import { CONFIG } from '../core/Config';
import { Graphics } from 'pixi.js';

export class CommandBrushTool implements Tool {
    private isSelecting: boolean = false;
    private isDrawing: boolean = false;
    private currentPathPoints: {x: number, y: number}[] = [];
    private lastPoint: {x: number, y: number} | null = null;
    private readonly MIN_DIST = 30; // Min distance between waypoints

    public onDown(world: WorldState, x: number, y: number): void {
        const hasSelection = this.hasSelection(world);

        if (!hasSelection) {
            // Start Selection
            this.isSelecting = true;
            this.selectInRadius(world, x, y, CONFIG.COMMAND_RADIUS);
        } else {
            // Check if clicking on sprig to reselect or empty to deselect
            const clickedSprig = world.sprigs.getSprigAt(x, y, 20);
            if (clickedSprig !== -1) {
                // Reselect (Keep current selection or clear and select new?)
                // Standard behavior: clear and select new on tap
                this.clearSelection(world);
                this.selectInRadius(world, x, y, CONFIG.COMMAND_RADIUS);
                this.isSelecting = true;
            } else {
                // Start drawing path
                this.isDrawing = true;
                this.currentPathPoints = [{x, y}];
                this.lastPoint = {x, y};
            }
        }
    }

    public onDrag(world: WorldState, x: number, y: number): void {
        if (this.isSelecting) {
            this.selectInRadius(world, x, y, CONFIG.COMMAND_RADIUS);
        } else if (this.isDrawing) {
            if (this.lastPoint) {
                const dx = x - this.lastPoint.x;
                const dy = y - this.lastPoint.y;
                if (Math.sqrt(dx*dx + dy*dy) > this.MIN_DIST) {
                    this.currentPathPoints.push({x, y});
                    this.lastPoint = {x, y};
                }
            }
        }
    }

    public onUp(world: WorldState, x: number, y: number): void {
        if (this.isSelecting) {
            this.isSelecting = false;
        } else if (this.isDrawing) {
            this.isDrawing = false;
            // Add final point
            this.currentPathPoints.push({x, y});
            
            // Create Path
            if (this.currentPathPoints.length > 1) {
                const pathId = world.paths.add(this.currentPathPoints);
                if (pathId !== -1) {
                    this.assignPathToSelected(world, pathId);
                }
            } else {
                // Double tap/Short drag on empty terrain -> Deselect
                this.clearSelection(world);
            }
            
            this.currentPathPoints = [];
            this.lastPoint = null;
        }
    }

    public drawPreview(g: Graphics): void {
        if (!this.isDrawing || this.currentPathPoints.length < 1) return;

        g.moveTo(this.currentPathPoints[0].x, this.currentPathPoints[0].y);
        for (let i = 1; i < this.currentPathPoints.length; i++) {
            const p = this.currentPathPoints[i];
            const size = 4 * (1 - i / (this.currentPathPoints.length + 1)) + 1;
            g.lineTo(p.x, p.y).stroke({ width: size, color: 0x00FF00, alpha: 0.5 });
            g.circle(p.x, p.y, size).fill({ color: 0x00FF00, alpha: 0.7 });
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

    private clearSelection(world: WorldState) {
        const sprigs = world.sprigs;
        for (let i = 0; i < sprigs.active.length; i++) {
            sprigs.selected[i] = 0;
        }
    }

    private hasSelection(world: WorldState): boolean {
        const sprigs = world.sprigs;
        for (let i = 0; i < sprigs.active.length; i++) {
            if (sprigs.active[i] && sprigs.selected[i]) return true;
        }
        return false;
    }

    private assignPathToSelected(world: WorldState, pathId: number) {
        const sprigs = world.sprigs;
        for (let i = 0; i < sprigs.active.length; i++) {
            if (sprigs.active[i] && sprigs.selected[i]) {
                sprigs.state[i] = SprigState.FORCED_MARCH;
                sprigs.pathId[i] = pathId;
                sprigs.pathTargetIdx[i] = 0;
                
                // Set first target
                const p = world.paths.getPoint(pathId, 0);
                if (p) {
                    sprigs.targetX[i] = p.x;
                    sprigs.targetY[i] = p.y;
                }
            }
        }
    }
}
