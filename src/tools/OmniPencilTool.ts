import { Ticker, Graphics, Point } from 'pixi.js';
import { ITool } from './ITool';
import { SprigSystem } from '../SprigSystem';
import { MovementPathSystem } from '../systems/MovementPathSystem';
import { CONFIG } from '../config';

type OmniMode = 'IDLE' | 'PREPARE_LASSO' | 'PREPARE_PATH';

export class OmniPencilTool implements ITool {
    private sprigSystem: SprigSystem;
    private movementPathSystem: MovementPathSystem;
    
    private mode: OmniMode = 'IDLE';
    private dragOrigin: Point = new Point();
    private points: Point[] = []; // Lasso/Path points
    
    // State
    private isDragging: boolean = false;
    private readonly DRAG_THRESHOLD_SQ = 5 * 5;

    constructor(sprigSystem: SprigSystem, movementPathSystem: MovementPathSystem) {
        this.sprigSystem = sprigSystem;
        this.movementPathSystem = movementPathSystem;
    }

    onActivate(): void {
        this.mode = 'IDLE';
        this.resetDrag();
    }

    onDeactivate(): void {
        this.mode = 'IDLE';
        this.resetDrag();
    }

    onDown(x: number, y: number): void {
        this.dragOrigin.set(x, y);
        this.isDragging = false;
        this.points = [new Point(x, y)];

        // Hit Test
        const hitSprigIdx = this.sprigSystem.getSprigAt(x, y, 20); // 20px hit radius
        const selectedIndices = this.sprigSystem.getSelectedIndices();
        const isSelected = hitSprigIdx !== -1 && selectedIndices.includes(hitSprigIdx);

        if (hitSprigIdx !== -1) {
            // Clicked Unit
            if (!isSelected) {
                // Select only this unit (unless shift? Spec says exclusive)
                this.clearSelection();
                this.sprigSystem.setSelected(hitSprigIdx, true);
            }
            this.mode = 'PREPARE_PATH';
        } else {
            // Clicked Empty
            // Spec: If selection empty -> Lasso. If selection has units -> Deselect All + Lasso.
            if (selectedIndices.length > 0) {
                this.clearSelection();
            }
            this.mode = 'PREPARE_LASSO';
        }
    }

    onHold(x: number, y: number, ticker: Ticker): void {
        // Drag Detection
        if (!this.isDragging) {
            const dx = x - this.dragOrigin.x;
            const dy = y - this.dragOrigin.y;
            if (dx*dx + dy*dy > this.DRAG_THRESHOLD_SQ) {
                this.isDragging = true;
            }
        }

        if (this.isDragging) {
            // Add points for trail
            const last = this.points[this.points.length - 1];
            const distSq = (x - last.x)**2 + (y - last.y)**2;
            if (distSq > 25) { // Sample every 5px
                this.points.push(new Point(x, y));
            }
        }
    }

    onUp(x: number, y: number): void {
        if (!this.isDragging) {
            // Tap Action
            const hitSprigIdx = this.sprigSystem.getSprigAt(x, y, 20);
            if (hitSprigIdx !== -1) {
                // Select Unit (Exclusive)
                this.clearSelection();
                this.sprigSystem.setSelected(hitSprigIdx, true);
            } else {
                // Empty -> Deselect All
                this.clearSelection();
            }
        } else {
            // Drag Action
            if (this.mode === 'PREPARE_LASSO') {
                this.finishLasso();
            } else if (this.mode === 'PREPARE_PATH') {
                this.finishPath();
            }
        }

        this.resetDrag();
    }

    update(ticker: Ticker): void {}

    renderCursor(g: Graphics, x: number, y: number): void {
        const cursorColor = 0x000000; // Black
        const cursorAlpha = 0.75;

        // Draw Cursor Tip
        g.circle(x, y, 5).fill({ color: cursorColor, alpha: cursorAlpha });

        // Draw In-Progress Action
        if (this.isDragging && this.points.length > 1) {
            g.moveTo(this.points[0].x, this.points[0].y);
            
            if (this.mode === 'PREPARE_LASSO') {
                for (let i = 1; i < this.points.length; i++) {
                    g.lineTo(this.points[i].x, this.points[i].y);
                }
                g.stroke({ width: 1, color: 0x808080, alpha: 0.5 }); // Gray lasso
                
                // Closing line (preview)
                g.lineTo(x, y);
                g.stroke({ width: 1, color: 0x808080, alpha: 0.2 }); // Faded gray
            } else if (this.mode === 'PREPARE_PATH') {
                for (let i = 1; i < this.points.length; i++) {
                    g.lineTo(this.points[i].x, this.points[i].y);
                }
                g.lineTo(x, y);
                g.stroke({ width: 3, color: 0x808080 }); // Gray path
            }
        }
    }

    private clearSelection() {
        const indices = this.sprigSystem.getSelectedIndices();
        indices.forEach(idx => this.sprigSystem.setSelected(idx, false));
    }

    private resetDrag() {
        this.isDragging = false;
        this.points = [];
        this.mode = 'IDLE';
    }

    private finishLasso() {
        // 1. Close loop
        // this.points is the polygon
        
        // 2. Iterate all sprigs
        const sprigs = this.sprigSystem.activeSprigCount;
        for (let i = 0; i < sprigs; i++) {
            const pos = this.sprigSystem.getSprigBounds(i);
            
            if (this.isPointInPolygon(pos.x, pos.y, this.points)) {
                this.sprigSystem.setSelected(i, true);
            }
        }
    }

    private finishPath() {
        if (this.points.length < 2) return;

        // Create MovementPath Entity
        const pathId = this.movementPathSystem.createPath(this.points);
        
        // Assign to selected units
        const indices = this.sprigSystem.getSelectedIndices();
        indices.forEach(idx => {
            this.sprigSystem.setPath(idx, pathId);
        });
        
        console.log("Path Created:", pathId, "for", indices.length, "units");
    }

    // Ray-casting algorithm
    private isPointInPolygon(x: number, y: number, poly: Point[]): boolean {
        let inside = false;
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            const xi = poly[i].x, yi = poly[i].y;
            const xj = poly[j].x, yj = poly[j].y;
            
            const intersect = ((yi > y) !== (yj > y))
                && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }
}
