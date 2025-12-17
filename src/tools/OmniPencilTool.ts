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
    private readonly DRAG_THRESHOLD_SQ = 10 * 10;

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

        // 1. Check Path Delete Button
        const deletePathId = this.movementPathSystem.isDeleteButtonAt(x, y);
        if (deletePathId !== -1) {
            this.movementPathSystem.removePath(deletePathId);
            return;
        }

        // 2. Check Path Selection
        const hitPathId = this.movementPathSystem.getPathAt(x, y);
        if (hitPathId !== -1) {
            this.deselectAllPaths();
            this.movementPathSystem.setPathSelection(hitPathId, true, new Point(x, y));
            return;
        } else {
            this.deselectAllPaths();
        }

        // Hit Test Sprigs
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
            // Don't deselect yet! Wait to see if it's a drag (Path) or tap (Deselect).
            // Default to IDLE until drag starts.
            this.mode = 'IDLE';
        }
    }

    onHold(x: number, y: number, ticker: Ticker): void {
        // Drag Detection
        if (!this.isDragging) {
            const dx = x - this.dragOrigin.x;
            const dy = y - this.dragOrigin.y;
            if (dx*dx + dy*dy > this.DRAG_THRESHOLD_SQ) {
                this.isDragging = true;
                
                // Determine Mode on Drag Start
                if (this.mode === 'IDLE') {
                    const selectedIndices = this.sprigSystem.getSelectedIndices();
                    if (selectedIndices.length > 0) {
                        this.mode = 'PREPARE_PATH';
                    } else {
                        this.mode = 'PREPARE_LASSO';
                    }
                }
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
        const cursorColor = CONFIG.PENCIL_VISUALS.COLOR;
        const cursorAlpha = CONFIG.PENCIL_VISUALS.ALPHA;
        const size = CONFIG.PENCIL_VISUALS.CURSOR_SIZE; // e.g. 15

        // Draw Isosceles Triangle Cursor
        // Tip at (x,y)
        // Pointing Up-Left (standard cursor orientation)
        // We simulate a rotation of -45 degrees
        
        // Unrotated (Pointing Down): Tip(0,0), Left(-w/2, -h), Right(w/2, -h) ??? No, Tip is usually 0,0.
        // Let's define shape relative to Tip (0,0).
        // Let's make it look like a standard mouse pointer (Right Triangle-ish but user asked for Isosceles).
        // Isosceles pointing Top-Left:
        // Tip: 0,0
        // Base Midpoint: 12, 12 (approx)
        
        // Let's just draw points manually.
        // Tip
        const p1x = x;
        const p1y = y;
        
        // Bottom Left (relative to tip)
        const p2x = x;
        const p2y = y + size * 1.5;
        
        // Right
        const p3x = x + size;
        const p3y = y + size; // Slightly higher than p2 to make it angled?
        
        // If strict Isosceles:
        // Tip (0,0). Base center (0, H). Width W.
        // P1(0,0). P2(-W/2, H). P3(W/2, H).
        // Rotate -30 deg.
        
        const w = size;
        const h = size * 1.5;
        
        // Rotation -30 deg (approx -0.5 rad)
        const cos = 0.866;
        const sin = -0.5;
        
        // P2 (Left Base): (-w/2, h)
        // P3 (Right Base): (w/2, h)
        
        const dx2 = -w/2 * cos - h * sin;
        const dy2 = -w/2 * sin + h * cos;
        
        const dx3 = w/2 * cos - h * sin;
        const dy3 = w/2 * sin + h * cos;
        
        g.poly([
            p1x, p1y,
            p1x + dx2, p1y + dy2,
            p1x + dx3, p1y + dy3
        ]).fill({ color: cursorColor, alpha: cursorAlpha });


        // Draw In-Progress Action
        const pathColor = CONFIG.PENCIL_VISUALS.COLOR;
        const pathAlpha = CONFIG.PENCIL_VISUALS.ALPHA;

        if (this.isDragging && this.points.length > 1) {
            if (this.mode === 'PREPARE_LASSO') {
                g.moveTo(this.points[0].x, this.points[0].y);
                
                // Lasso with thicker, dashed style
                const dashLength = 8; 
                const gapLength = 6;  
                const lineWidth = 3;  
                const patternLength = dashLength + gapLength;

                // Continuous Dash Rendering
                let currentPatternDist = 0; 

                for (let i = 1; i < this.points.length; i++) {
                    let p1 = this.points[i-1];
                    const p2 = this.points[i];

                    const dx = p2.x - p1.x;
                    const dy = p2.y - p1.y;
                    const len = Math.sqrt(dx * dx + dy * dy);
                    
                    if (len === 0) continue;

                    const ux = dx / len;
                    const uy = dy / len;
                    
                    let distTraveled = 0;

                    while (distTraveled < len) {
                        const phase = currentPatternDist % patternLength;
                        const isDash = phase < dashLength;
                        const distRemainingInPhase = isDash ? (dashLength - phase) : (patternLength - phase);
                        
                        const drawDist = Math.min(len - distTraveled, distRemainingInPhase);

                        const startX = p1.x + distTraveled * ux;
                        const startY = p1.y + distTraveled * uy;
                        const endX = startX + drawDist * ux;
                        const endY = startY + drawDist * uy;

                        if (isDash) {
                            g.moveTo(startX, startY);
                            g.lineTo(endX, endY);
                        }

                        distTraveled += drawDist;
                        currentPatternDist += drawDist;
                    }
                }
                g.stroke({ width: lineWidth, color: pathColor, alpha: pathAlpha }); 
                
                // Closing line (ghost line)
                const x1 = x;
                const y1 = y;
                const x2 = this.dragOrigin.x;
                const y2 = this.dragOrigin.y;

                const cdx = x2 - x1;
                const cdy = y2 - y1;
                const clen = Math.sqrt(cdx * cdx + cdy * cdy);
                
                if (clen > 0) { 
                    const numSegments = Math.floor(clen / (dashLength + gapLength));
                    const unitVx = cdx / clen;
                    const unitVy = cdy / clen;

                    for (let j = 0; j < numSegments; j++) {
                        const startX = x1 + j * (dashLength + gapLength) * unitVx;
                        const startY = y1 + j * (dashLength + gapLength) * unitVy;
                        const endX = startX + dashLength * unitVx;
                        const endY = startY + dashLength * unitVy;
                        
                        g.moveTo(startX, startY);
                        g.lineTo(endX, endY);
                    }
                }
                g.stroke({ width: lineWidth, color: pathColor, alpha: pathAlpha * 0.5 }); 

            } else if (this.mode === 'PREPARE_PATH') {
                g.moveTo(this.points[0].x, this.points[0].y);
                for (let i = 1; i < this.points.length; i++) {
                    g.lineTo(this.points[i].x, this.points[i].y);
                }
                            g.lineTo(x, y);
                            g.stroke({ width: 3, color: pathColor, alpha: pathAlpha }); // Gray path
                        }
                    }
                }
    }

    private deselectAllPaths() {
        const ids = this.movementPathSystem.getAllPathIds();
        ids.forEach(id => this.movementPathSystem.setPathSelection(id, false));
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
