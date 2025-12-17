import { Container, Graphics, Point } from 'pixi.js';
import { CONFIG } from '../config';

export interface MovementPath {
    id: number;
    points: Point[];
    selected: boolean;
    selectedAt: Point | null; // Where the path was tapped for selection
}

export class MovementPathSystem {
    public container: Container;
    private graphics: Graphics;
    private paths: MovementPath[] = [];
    private nextId = 1;

    constructor() {
        this.container = new Container();
        this.graphics = new Graphics();
        this.container.addChild(this.graphics);
    }

    public createPath(points: Point[]): number {
        // Simplify points? (Optimization for later)
        const id = this.nextId++;
        this.paths.push({
            id,
            points: [...points], // Copy
            selected: false,
            selectedAt: null
        });
        this.draw();
        return id;
    }

    public getPath(id: number): MovementPath | undefined {
        return this.paths.find(p => p.id === id);
    }

    public getAllPathIds(): number[] {
        return this.paths.map(p => p.id);
    }

    public removePath(id: number) {
        this.paths = this.paths.filter(p => p.id !== id);
        this.draw();
    }

    public setPathSelection(id: number, selected: boolean, selectedAt: Point | null = null) {
        const path = this.paths.find(p => p.id === id);
        if (path) {
            path.selected = selected;
            path.selectedAt = selectedAt;
            this.draw();
        }
    }

    // Check if the delete button (Red X) of a selected path is tapped
    public isDeleteButtonAt(x: number, y: number): number {
        const radius = 20; // Hit radius for button
        for (const path of this.paths) {
            if (path.selected && path.selectedAt) {
                const dx = path.selectedAt.x - x;
                const dy = path.selectedAt.y - y;
                if (dx*dx + dy*dy < radius*radius) {
                    return path.id;
                }
            }
        }
        return -1;
    }

    // Hit test for path segments
    public getPathAt(x: number, y: number, radius: number = 20): number {
        const rSq = radius * radius;
        for (const path of this.paths) {
            if (path.points.length < 2) continue;
            
            for (let i = 0; i < path.points.length - 1; i++) {
                const p1 = path.points[i];
                const p2 = path.points[i+1];
                
                // Distance from point to segment
                const distSq = this.distToSegmentSq(x, y, p1.x, p1.y, p2.x, p2.y);
                if (distSq < rSq) {
                    return path.id;
                }
            }
        }
        return -1;
    }

    private distToSegmentSq(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
        const l2 = (x1 - x2)**2 + (y1 - y2)**2;
        if (l2 === 0) return (px - x1)**2 + (py - y1)**2;
        
        let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
        t = Math.max(0, Math.min(1, t));
        
        return (px - (x1 + t * (x2 - x1)))**2 + (py - (y1 + t * (y2 - y1)))**2;
    }

    private draw() {
        this.graphics.clear();
        
        for (const path of this.paths) {
            if (path.points.length < 2) continue;

            const color = path.selected ? 0xFFFF00 : CONFIG.PENCIL_VISUALS.COLOR; // Yellow if selected, Gray otherwise
            const alpha = CONFIG.PENCIL_VISUALS.ALPHA;
            
            // Draw Line
            this.graphics.moveTo(path.points[0].x, path.points[0].y);
            for (let i = 1; i < path.points.length; i++) {
                this.graphics.lineTo(path.points[i].x, path.points[i].y);
            }
            this.graphics.stroke({ width: 3, color: color, alpha: alpha });

            // Draw Arrowhead at End
            const end = path.points[path.points.length - 1];
            const prev = path.points[path.points.length - 2];
            
            // Calculate angle
            const angle = Math.atan2(end.y - prev.y, end.x - prev.x);
            const headLen = 15;
            
            this.graphics.moveTo(end.x, end.y);
            this.graphics.lineTo(
                end.x - headLen * Math.cos(angle - Math.PI / 6),
                end.y - headLen * Math.sin(angle - Math.PI / 6)
            );
            this.graphics.moveTo(end.x, end.y);
            this.graphics.lineTo(
                end.x - headLen * Math.cos(angle + Math.PI / 6),
                end.y - headLen * Math.sin(angle + Math.PI / 6)
            );
            this.graphics.stroke({ width: 3, color: color });
            
            // Draw Delete Button if selected
            if (path.selected && path.selectedAt) {
                const btnX = path.selectedAt.x;
                const btnY = path.selectedAt.y;
                const r = 15;
                
                // White BG
                this.graphics.circle(btnX, btnY, r).fill(0xFFFFFF).stroke({ width: 2, color: 0x000000 });
                
                // Red X
                this.graphics.moveTo(btnX - 8, btnY - 8);
                this.graphics.lineTo(btnX + 8, btnY + 8);
                this.graphics.moveTo(btnX + 8, btnY - 8);
                this.graphics.lineTo(btnX - 8, btnY + 8);
                this.graphics.stroke({ width: 3, color: 0xFF0000 });
            }
        }
    }
}
