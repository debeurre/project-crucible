import { Application, Sprite, Point, Container, Graphics, Ticker } from 'pixi.js';
import { CONFIG } from '../config';
import { TextureFactory } from './TextureFactory';
import { MapSystem } from './MapSystem';
import { ISystem } from './ISystem';
import { FloatingTextSystem } from './FloatingTextSystem';

export class ResourceSystem implements ISystem {
    public container: Container; 
    public resourceSprite: Sprite; // The Berry Bush
    public heartSprite: Sprite;    // The Castle (Sink)
    
    private app: Application;
    private mapSystem: MapSystem;
    private floatingTextSystem: FloatingTextSystem;
    
    private nodePosition: Point; // Berry Bush Pos
    private heartPosition: Point; // Castle Pos
    
    private heartEnergy: number = 100;
    private readonly MAX_ENERGY: number = 100;
    private readonly DRAIN_RATE: number = 1; // 1 per second per spec
    
    private energyBar: Graphics;

    constructor(app: Application, mapSystem: MapSystem, floatingTextSystem: FloatingTextSystem) {
        this.app = app;
        this.mapSystem = mapSystem;
        this.floatingTextSystem = floatingTextSystem;
        this.container = new Container();
        
        // 1. Berry Bush (Source)
        this.nodePosition = new Point(
            app.screen.width * 0.25,
            app.screen.height * 0.5
        );
        const resourceTex = TextureFactory.getResourceNodeTexture(app.renderer);
        this.resourceSprite = new Sprite(resourceTex);
        this.resourceSprite.anchor.set(0.5);
        this.resourceSprite.tint = CONFIG.RESOURCE_NODE_COLOR;
        
        // 2. Castle (Sink)
        this.heartPosition = new Point(
            app.screen.width * 0.5,
            app.screen.height * 0.5
        );
        const heartTex = TextureFactory.getCrucibleTexture(app.renderer);
        this.heartSprite = new Sprite(heartTex);
        this.heartSprite.anchor.set(0.5);
        this.heartSprite.tint = CONFIG.CRUCIBLE_COLOR;
        
        // 3. Energy Bar
        this.energyBar = new Graphics();
        this.heartSprite.addChild(this.energyBar);

        this.container.addChild(this.resourceSprite);
        this.container.addChild(this.heartSprite);

        this.updateVisuals();

        // Handle resize
        this.app.renderer.on('resize', this.resize.bind(this));
        this.resize(this.app.screen.width, this.app.screen.height);
    }
    
    public update(ticker: Ticker) {
        const dt = ticker.deltaTime / 60; // Seconds
        
        // Drain Energy
        if (this.heartEnergy > 0) {
            this.heartEnergy -= this.DRAIN_RATE * dt;
            if (this.heartEnergy < 0) this.heartEnergy = 0;
        }
        
        // Update Bar
        this.drawEnergyBar();
    }

    public feedHeart(amount: number = 10) {
        this.heartEnergy += amount;
        if (this.heartEnergy > this.MAX_ENERGY) this.heartEnergy = this.MAX_ENERGY;
    }

    public spawnRandomly() {
        const padding = CONFIG.RESOURCE_NODE_RADIUS + CONFIG.RESOURCE_NODE_SPAWN_MARGIN;
        const newPos = this.mapSystem.getRandomPoint(padding);
        
        this.nodePosition.copyFrom(newPos);
        this.updateVisuals();
    }

    private updateVisuals() {
        this.resourceSprite.x = this.nodePosition.x;
        this.resourceSprite.y = this.nodePosition.y;
        this.resourceSprite.rotation = CONFIG.RESOURCE_NODE_ROTATION;
        
        this.heartSprite.x = this.heartPosition.x;
        this.heartSprite.y = this.heartPosition.y;
    }
    
    private drawEnergyBar() {
        this.energyBar.clear();
        const width = 40;
        const height = 6;
        const pct = this.heartEnergy / this.MAX_ENERGY;
        
        // Background
        this.energyBar.rect(-width/2, -40, width, height).fill(0x000000);
        
        // Foreground
        const color = pct > 0.5 ? 0x00FF00 : (pct > 0.2 ? 0xFFFF00 : 0xFF0000);
        this.energyBar.rect(-width/2 + 1, -39, (width - 2) * pct, height - 2).fill(color);
    }

    public getPosition(): Point {
        return this.nodePosition;
    }
    
    public getHeartPosition(): Point {
        return this.heartPosition;
    }

    public isInside(x: number, y: number): boolean {
        // Simple circle check from center of Berry Bush
        const dx = x - this.nodePosition.x;
        const dy = y - this.nodePosition.y;
        return (dx * dx + dy * dy) < CONFIG.RESOURCE_NODE_RADIUS**2;
    }

    public isNearSource(x: number, y: number, radius: number = 40): boolean {
        const dx = x - this.nodePosition.x;
        const dy = y - this.nodePosition.y;
        return (dx * dx + dy * dy) < (CONFIG.RESOURCE_NODE_RADIUS + radius)**2;
    }

    public harvestSource(x: number, y: number): boolean {
        // Validation logic (e.g. cooldowns?)
        // For now, infinite resource, instant success if near.
        return this.isNearSource(x, y);
    }

    public isInsideHeart(x: number, y: number): boolean {
        const dx = x - this.heartPosition.x;
        const dy = y - this.heartPosition.y;
        return (dx * dx + dy * dy) < CONFIG.CRUCIBLE_RADIUS**2;
    }

    public resize(width: number, height: number) {
        this.heartPosition.set(width * 0.5, height * 0.5);
        this.nodePosition.set(width * 0.25, height * 0.5);
        this.updateVisuals();
    }
}
