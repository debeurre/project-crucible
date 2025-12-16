import { Container, Graphics, Point } from 'pixi.js';

export interface MovementPath {
    id: number;
    points: Point[];
    selected: boolean;
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
            selected: false
        });
        this.draw();
        return id;
    }

    public getPath(id: number): MovementPath | undefined {
        return this.paths.find(p => p.id === id);
    }

    public removePath(id: number) {
        this.paths = this.paths.filter(p => p.id !== id);
        this.draw();
    }

    public setPathSelection(id: number, selected: boolean) {
        const path = this.paths.find(p => p.id === id);
        if (path) {
            path.selected = selected;
            this.draw();
        }
    }

    // Hit test for path handles (Arrowheads at the end)
    public getPathAt(x: number, y: number, radius: number = 20): number {
        const rSq = radius * radius;
        for (const path of this.paths) {
            if (path.points.length === 0) continue;
            const end = path.points[path.points.length - 1];
            const dx = end.x - x;
            const dy = end.y - y;
            if (dx * dx + dy * dy < rSq) {
                return path.id;
            }
        }
        return -1;
    }

    private draw() {
        this.graphics.clear();
        
        for (const path of this.paths) {
            if (path.points.length < 2) continue;

            const color = path.selected ? 0xFFFF00 : 0xFFFFFF; // Yellow if selected, White otherwise
            
            // Draw Line
            this.graphics.moveTo(path.points[0].x, path.points[0].y);
            for (let i = 1; i < path.points.length; i++) {
                this.graphics.lineTo(path.points[i].x, path.points[i].y);
            }
            this.graphics.stroke({ width: 3, color: color, alpha: 0.8 });

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
            
            // If selected, show delete button (Red X) near handle?
            // For now, just highlighting the arrow is enough context.
        }
    }
}
