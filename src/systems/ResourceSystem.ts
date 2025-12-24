import { Application, Sprite, Point, Container, Graphics, Ticker } from 'pixi.js';
import { CONFIG } from '../config';
import { TextureFactory } from './TextureFactory';
import { MapSystem } from './MapSystem';
import { ISystem } from './ISystem';

export class ResourceSystem implements ISystem {
    public container: Container; 
    public heartSprite: Sprite | null = null;    // The Castle (Sink)
    public sourceSprites: Sprite[] = [];         // Berry Bushes
    
    private app: Application;
    
    private heartPosition: Point = new Point(0, 0); 
    private sourcePositions: Point[] = [];
    
    private heartEnergy: number = 100;
    private readonly MAX_ENERGY: number = 100;
    private readonly DRAIN_RATE: number = 1; 
    
    private energyBar: Graphics;

    constructor(app: Application, _mapSystem: MapSystem) {
        this.app = app;
        this.container = new Container();
        this.energyBar = new Graphics();
    }

    public loadLevelData(structures: any[]) {
        // Clear existing
        this.container.removeChildren();
        this.sourceSprites = [];
        this.sourcePositions = [];
        this.heartSprite = null;
        
        const { width, height } = this.app.screen;

        structures.forEach(struct => {
            let x = struct.x;
            let y = struct.y;
            
            if (struct.relative) {
                x *= width;
                y *= height;
            }

            if (struct.type === 'CASTLE') {
                const heartTex = TextureFactory.getCrucibleTexture(this.app.renderer);
                this.heartSprite = new Sprite(heartTex);
                this.heartSprite.anchor.set(0.5);
                this.heartSprite.tint = CONFIG.CRUCIBLE_COLOR;
                this.heartSprite.x = x;
                this.heartSprite.y = y;
                
                this.heartPosition.set(x, y);
                
                // Add Bar to Heart
                this.energyBar.clear();
                this.heartSprite.addChild(this.energyBar);
                
                this.container.addChild(this.heartSprite);
            
            } else if (struct.type === 'RESOURCE_NODE' || struct.type === 'BUSH' || struct.type === 'GENERIC') {
                const resourceTex = TextureFactory.getResourceNodeTexture(this.app.renderer);
                const sprite = new Sprite(resourceTex);
                sprite.anchor.set(0.5);
                sprite.tint = struct.type === 'BUSH' ? 0x006400 : CONFIG.RESOURCE_NODE_COLOR; // Dark Green for Bush
                sprite.x = x;
                sprite.y = y;
                sprite.rotation = CONFIG.RESOURCE_NODE_ROTATION;

                this.sourceSprites.push(sprite);
                this.sourcePositions.push(new Point(x, y));
                this.container.addChild(sprite);
            }
        });
        
        this.heartEnergy = this.MAX_ENERGY; // Reset energy
    }
    
    public isInsideResource(x: number, y: number): boolean {
        return this.isNearSource(x, y);
    }
    
    public update(ticker: Ticker) {
        const dt = ticker.deltaTime / 60; 
        
        if (this.heartSprite) {
            // Drain Energy
            if (this.heartEnergy > 0) {
                this.heartEnergy -= this.DRAIN_RATE * dt;
                if (this.heartEnergy < 0) this.heartEnergy = 0;
            }
            this.drawEnergyBar();
        }
    }

    public feedHeart(amount: number = 10) {
        this.heartEnergy += amount;
        if (this.heartEnergy > this.MAX_ENERGY) this.heartEnergy = this.MAX_ENERGY;
    }

    private drawEnergyBar() {
        if (!this.heartSprite) return;
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

    public getHeartPosition(): Point {
        return this.heartPosition;
    }

    public isInside(x: number, y: number): boolean {
        return this.isNearSource(x, y);
    }

    public isNearSource(x: number, y: number, radius: number = 40): boolean {
        // Check closest source
        const rSq = (CONFIG.RESOURCE_NODE_RADIUS + radius)**2;
        
        for (const pos of this.sourcePositions) {
            const dx = x - pos.x;
            const dy = y - pos.y;
            if (dx*dx + dy*dy < rSq) return true;
        }
        return false;
    }

    public harvestSource(x: number, y: number): boolean {
        return this.isNearSource(x, y);
    }

    public isInsideHeart(x: number, y: number): boolean {
        if (!this.heartSprite) return false;
        const dx = x - this.heartPosition.x;
        const dy = y - this.heartPosition.y;
        return (dx * dx + dy * dy) < CONFIG.CRUCIBLE_RADIUS**2;
    }

    public resize() {
        // Structure positions are currently absolute/relative on load and don't dynamically scale yet.
    }
}
