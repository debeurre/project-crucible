import { Application, Graphics, Point } from 'pixi.js';
import { CONFIG } from '../config';

export class ResourceSystem {
    public container: Graphics; // Single Graphics object for the node
    private app: Application;
    private nodePosition: Point; // Position of the node

    constructor(app: Application) {
        this.app = app;
        this.container = new Graphics();
        this.nodePosition = new Point(
            app.screen.width * 0.25, // Example position
            app.screen.height * 0.5
        );

        this.drawNode();

        // Handle resize
        this.app.renderer.on('resize', this.resize.bind(this));
        this.resize();
    }

    private drawNode() {
        this.container.clear();
        
        // Draw a trapezoid centered at 0,0
        const radius = CONFIG.RESOURCE_NODE_RADIUS;
        const width = radius * 2;
        const height = radius * 1.5;
        const offset = radius * 0.5;

        // Top-Left at (-width/2, -height/2)
        const x = -width / 2;
        const y = -height / 2;

        this.container.moveTo(x, y);
        this.container.lineTo(x + width, y);
        this.container.lineTo(x + width - offset, y + height);
        this.container.lineTo(x + offset, y + height);
        this.container.closePath();
        
        // v8: Use fill() at the end
        this.container.fill(CONFIG.RESOURCE_NODE_COLOR);

        this.container.x = this.nodePosition.x;
        this.container.y = this.nodePosition.y;
        this.container.rotation = CONFIG.RESOURCE_NODE_ROTATION;
    }

    public getPosition(): Point {
        return this.nodePosition;
    }

    public isInside(x: number, y: number): boolean {
        // Simple circle check from center
        const dx = x - this.nodePosition.x;
        const dy = y - this.nodePosition.y;
        return (dx * dx + dy * dy) < CONFIG.RESOURCE_NODE_RADIUS**2;
    }

    public resize() {
        // Re-position the node, re-draw it
        this.nodePosition.set(this.app.screen.width * 0.25, this.app.screen.height * 0.5);
        this.drawNode();
    }
}
