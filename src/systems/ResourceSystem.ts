import { Application, Sprite, Point, Container, Graphics, Ticker } from 'pixi.js';
import { CONFIG } from '../config';
import { TextureFactory } from './TextureFactory';
import { MapSystem } from './MapSystem';
import { ISystem } from './ISystem';

export class ResourceSystem implements ISystem {
    public container: Container; 
    public castleSprite: Sprite | null = null;    // The Castle (Sink)
    public sourceSprites: Sprite[] = [];         // Berry Bushes
    
    private app: Application;
    
    private castlePosition: Point = new Point(0, 0); 
    private sourcePositions: Point[] = [];
    
    private castleEnergy: number = 100;
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
        this.castleSprite = null;
        
        const { width, height } = this.app.screen;

        structures.forEach(struct => {
            let x = struct.x;
            let y = struct.y;
            
            if (struct.relative) {
                x *= width;
                y *= height;
            }

            if (struct.type === 'CASTLE') {
                const castleTex = TextureFactory.getCastleTexture(this.app.renderer);
                this.castleSprite = new Sprite(castleTex);
                this.castleSprite.anchor.set(0.5);
                this.castleSprite.tint = CONFIG.CASTLE_COLOR; // Brown
                this.castleSprite.x = x;
                this.castleSprite.y = y;
                
                this.castlePosition.set(x, y);
                
                // Add Bar to Castle
                this.energyBar.clear();
                this.castleSprite.addChild(this.energyBar);
                
                this.container.addChild(this.castleSprite);
            
            } else if (struct.type === 'CRUCIBLE') {
                const crucibleTex = TextureFactory.getCrucibleTexture(this.app.renderer);
                this.castleSprite = new Sprite(crucibleTex);
                this.castleSprite.anchor.set(0.5);
                this.castleSprite.tint = CONFIG.CRUCIBLE_COLOR; // Gold
                this.castleSprite.x = x;
                this.castleSprite.y = y;
                
                this.castlePosition.set(x, y);
                
                // Add Bar to Crucible (if desired, or maybe hidden for legacy?)
                // The spec says "Heart logic".
                // I'll keep the bar for both.
                this.energyBar.clear();
                this.castleSprite.addChild(this.energyBar);
                
                this.container.addChild(this.castleSprite);

            } else if (struct.type === 'RESOURCE_NODE' || struct.type === 'BUSH' || struct.type === 'GENERIC') {
                const resourceTex = TextureFactory.getResourceNodeTexture(this.app.renderer);
                const sprite = new Sprite(resourceTex);
                sprite.anchor.set(0.5);
                sprite.tint = struct.type === 'BUSH' ? 0x006400 : CONFIG.RESOURCE_NODE_COLOR;
                sprite.x = x;
                sprite.y = y;
                sprite.rotation = CONFIG.RESOURCE_NODE_ROTATION;

                this.sourceSprites.push(sprite);
                this.sourcePositions.push(new Point(x, y));
                this.container.addChild(sprite);
            }
        });
        
        this.castleEnergy = this.MAX_ENERGY; // Reset energy
    }
    
    public update(ticker: Ticker) {
        const dt = ticker.deltaTime / 60; 
        
        if (this.castleSprite) {
            // Drain Energy
            if (this.castleEnergy > 0) {
                this.castleEnergy -= this.DRAIN_RATE * dt;
                if (this.castleEnergy < 0) this.castleEnergy = 0;
            }
            this.drawEnergyBar();
        }
    }

    public feedCastle(amount: number = 10) {
        this.castleEnergy += amount;
        if (this.castleEnergy > this.MAX_ENERGY) this.castleEnergy = this.MAX_ENERGY;
    }

    private drawEnergyBar() {
        if (!this.castleSprite) return;
        this.energyBar.clear();
        const width = 40;
        const height = 6;
        const pct = this.castleEnergy / this.MAX_ENERGY;
        
        // Background
        this.energyBar.rect(-width/2, -40, width, height).fill(0x000000);
        
        // Foreground
        const color = pct > 0.5 ? 0x00FF00 : (pct > 0.2 ? 0xFFFF00 : 0xFF0000);
        this.energyBar.rect(-width/2 + 1, -39, (width - 2) * pct, height - 2).fill(color);
    }

    public getCastlePosition(): Point {
        return this.castlePosition;
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

    public isInsideCastle(x: number, y: number): boolean {
        if (!this.castleSprite) return false;
        const dx = x - this.castlePosition.x;
        const dy = y - this.castlePosition.y;
        return (dx * dx + dy * dy) < CONFIG.CASTLE_RADIUS**2;
    }

    public resize() {
        // Structure positions are currently absolute/relative on load and don't dynamically scale yet.
    }
}