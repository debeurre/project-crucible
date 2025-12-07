import { Application, Graphics, Container, Point } from 'pixi.js';
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
        this.container.beginFill(CONFIG.RESOURCE_NODE_COLOR);
        // Draw a trapezoid: (0,0), (width,0), (width-offset, height), (offset, height)
        const radius = CONFIG.RESOURCE_NODE_RADIUS;
        const width = radius * 2;
        const height = radius * 1.5;
        const offset = radius * 0.5;

        this.container.moveTo(0, 0);
        this.container.lineTo(width, 0);
        this.container.lineTo(width - offset, height);
        this.container.lineTo(offset, height);
        this.container.closePath();
        this.container.endFill();

        this.container.x = this.nodePosition.x - width / 2; // Center the graphics
        this.container.y = this.nodePosition.y - height / 2;
    }

    public getPosition(): Point {
        return this.nodePosition;
    }

    public isInside(x: number, y: number): boolean {
        // Simple circle check for now, for performance/simplicity
        // AABB check is also possible but circle is easier for now.
        const dx = x - this.nodePosition.x - (this.container.width / 2 - CONFIG.RESOURCE_NODE_RADIUS * 0.5); // Adjust for trapezoid offset. Needs re-eval
        const dy = y - this.nodePosition.y;
        return (dx * dx + dy * dy) < CONFIG.RESOURCE_NODE_RADIUS**2;
    }

    public resize() {
        // Re-position the node, re-draw it
        this.nodePosition.set(this.app.screen.width * 0.25, this.app.screen.height * 0.5);
        this.drawNode();
    }
}
