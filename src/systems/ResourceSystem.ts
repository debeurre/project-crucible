import { Application, Sprite, Point } from 'pixi.js';
import { CONFIG } from '../config';
import { TextureFactory } from './TextureFactory';
import { MapSystem } from './MapSystem';

export class ResourceSystem {
    public container: Sprite; // Changed to Sprite
    private app: Application;
    private mapSystem: MapSystem;
    private nodePosition: Point; // Position of the node

    constructor(app: Application, mapSystem: MapSystem) {
        this.app = app;
        this.mapSystem = mapSystem;
        this.nodePosition = new Point(
            app.screen.width * 0.25, // Example position
            app.screen.height * 0.5
        );
        
        const texture = TextureFactory.getResourceNodeTexture(app.renderer);
        this.container = new Sprite(texture);
        this.container.anchor.set(0.5);
        this.container.tint = CONFIG.RESOURCE_NODE_COLOR;

        this.updateNodeVisuals();

        // Handle resize
        this.app.renderer.on('resize', this.resize.bind(this));
        this.resize();
    }
    
    public spawnRandomly() {
        const padding = CONFIG.RESOURCE_NODE_RADIUS + CONFIG.RESOURCE_NODE_SPAWN_MARGIN;
        const newPos = this.mapSystem.getRandomPoint(padding);
        
        this.nodePosition.copyFrom(newPos);
        
        // Update visual position
        this.container.x = this.nodePosition.x;
        this.container.y = this.nodePosition.y;
    }

    private updateNodeVisuals() {
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
        this.updateNodeVisuals();
    }
}
