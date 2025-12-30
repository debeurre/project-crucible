import { ITool } from './ITool';
import { SprigSystem } from '../SprigSystem';
import { MovementPathSystem } from '../systems/MovementPathSystem';
import { Graphics, Ticker, Point } from 'pixi.js';

export class CommandBrushTool implements ITool {
    private sprigSystem: SprigSystem;
    private movementPathSystem: MovementPathSystem;
    
    private mode: 'IDLE' | 'BRUSH_SELECT' | 'CREATE_PATH' = 'IDLE';
    private brushRadius: number = 30;
    
    // Path Creation
    private pathPoints: {x: number, y: number}[] = [];
    private pathTimer: number = 0;
    private readonly PATH_RECORD_INTERVAL = 0.05; // Seconds

    constructor(sprigSystem: SprigSystem, movementPathSystem: MovementPathSystem) {
        this.sprigSystem = sprigSystem;
        this.movementPathSystem = movementPathSystem;
    }

    public onActivate() {}
    public onDeactivate() {}

    public onDown(_x: number, _y: number) {
        this.pathPoints = [];
        this.pathTimer = 0;
        
        // Decide mode based on current selection
        const selected = this.sprigSystem.getSelectedIndices();
        if (selected.length > 0) {
            this.mode = 'CREATE_PATH';
        } else {
            this.mode = 'BRUSH_SELECT';
        }
    }

    public onHold(x: number, y: number, ticker: Ticker) {
        if (this.mode === 'BRUSH_SELECT') {
            const indices = this.sprigSystem.getSprigsAt(x, y, this.brushRadius);
            for (const i of indices) {
                this.sprigSystem.setSelected(i, true);
            }
        } else if (this.mode === 'CREATE_PATH') {
            this.pathTimer += ticker.deltaTime / 60;
            if (this.pathTimer >= this.PATH_RECORD_INTERVAL || this.pathPoints.length === 0) {
                this.pathTimer = 0;
                this.pathPoints.push({x, y});
            }
        }
    }

    public onUp(_x: number, _y: number) {
        if (this.mode === 'CREATE_PATH') {
            if (this.pathPoints.length > 1) {
                const points = this.pathPoints.map(p => new Point(p.x, p.y));
                const pathId = this.movementPathSystem.createPath(points);
                const selected = this.sprigSystem.getSelectedIndices();
                for (const i of selected) {
                    this.sprigSystem.setPath(i, pathId);
                    this.sprigSystem.setSelected(i, false); // Deselect after assigning
                }
            }
        } else if (this.mode === 'BRUSH_SELECT') {
            // Keep selection
        }
        
        this.mode = 'IDLE';
        this.pathPoints = [];
    }

    public update(_ticker: Ticker) {}

    public renderCursor(g: Graphics, x: number, y: number) {
        // Cursor
        g.circle(x, y, this.brushRadius).stroke({ width: 2, color: 0xFFFFFF });
        
        // Path Preview
        if (this.mode === 'CREATE_PATH' && this.pathPoints.length > 0) {
            g.moveTo(this.pathPoints[0].x, this.pathPoints[0].y);
            for (let i = 1; i < this.pathPoints.length; i++) {
                g.lineTo(this.pathPoints[i].x, this.pathPoints[i].y);
            }
            g.stroke({ width: 2, color: 0x00FF00 });
            
            // Draw current drag line
            const last = this.pathPoints[this.pathPoints.length - 1];
            g.moveTo(last.x, last.y);
            g.lineTo(x, y);
            g.stroke({ width: 2, color: 0x00FF00, alpha: 0.5 });
        }
    }
}
