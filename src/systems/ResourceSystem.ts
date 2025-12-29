import { Application, Sprite, Point, Container, Graphics, Ticker } from 'pixi.js';
import { CONFIG } from '../config';
import { TextureFactory } from './TextureFactory';
import { MapSystem } from './MapSystem';
import { ISystem } from './ISystem';

interface StructureData {
    sprite: Sprite;
    type: string;
    health: number;
    x: number;
    y: number;
}

export class ResourceSystem implements ISystem {
    public container: Container; 
    public castleSprite: Sprite | null = null;    // The Castle (Sink)
    private castleContainer: Container | null = null; // Container for Sprite + UI
    private sources: StructureData[] = [];         // Resource Nodes
    
    private app: Application;
    
    private castlePosition: Point = new Point(0, 0); 
    
    private castleEnergy: number = 100;
    private readonly MAX_ENERGY: number = 100;
    private readonly DRAIN_RATE: number = 1; 
    
    private energyBar: Graphics;
    private sinkType: 'CASTLE' | 'CRUCIBLE' | 'NEST' | 'NONE' = 'NONE';

    constructor(app: Application, _mapSystem: MapSystem) {
        this.app = app;
        this.container = new Container();
        this.energyBar = new Graphics();
    }

    public loadLevelData(structures: any[]) {
        console.log('ResourceSystem loading structures:', structures);
        // Clear existing
        this.container.removeChildren();
        this.sources = [];
        this.castleSprite = null;
        this.castleContainer = null;
        this.sinkType = 'NONE';
        
        const { width, height } = this.app.screen;

        structures.forEach(struct => {
            let x = struct.x;
            let y = struct.y;
            
            if (struct.relative) {
                x *= width;
                y *= height;
            }

            if (struct.type === 'CASTLE') {
                this.sinkType = 'CASTLE';
                const castleTex = TextureFactory.getCastleTexture(this.app.renderer);
                this.castleSprite = new Sprite(castleTex);
                this.castleSprite.anchor.set(0.5);
                this.castleSprite.tint = CONFIG.CASTLE_COLOR; // Brown
                this.castleSprite.x = 0;
                this.castleSprite.y = 0;
                
                this.castleContainer = new Container();
                this.castleContainer.x = x;
                this.castleContainer.y = y;
                
                this.castlePosition.set(x, y);
                
                // Add Bar to Container (sibling to sprite)
                this.energyBar.clear();
                this.castleContainer.addChild(this.castleSprite);
                this.castleContainer.addChild(this.energyBar);
                
                this.container.addChild(this.castleContainer);
            
            } else if (struct.type === 'CRUCIBLE') {
                this.sinkType = 'CRUCIBLE';
                const crucibleTex = TextureFactory.getCrucibleTexture(this.app.renderer);
                this.castleSprite = new Sprite(crucibleTex);
                this.castleSprite.anchor.set(0.5);
                this.castleSprite.tint = CONFIG.CRUCIBLE_COLOR; // Gold
                this.castleSprite.x = 0;
                this.castleSprite.y = 0;
                
                this.castleContainer = new Container();
                this.castleContainer.x = x;
                this.castleContainer.y = y;
                
                this.castlePosition.set(x, y);
                
                // Add Bar to Container (sibling to sprite)
                this.energyBar.clear();
                this.castleContainer.addChild(this.castleSprite);
                this.castleContainer.addChild(this.energyBar);
                
                this.container.addChild(this.castleContainer);

            } else if (struct.type === 'NEST') {
                this.sinkType = 'NEST';
                const nestTex = TextureFactory.getNestTexture(this.app.renderer);
                this.castleSprite = new Sprite(nestTex);
                this.castleSprite.anchor.set(0.5);
                this.castleSprite.tint = 0xFFD700; // Gold
                this.castleSprite.x = 0;
                this.castleSprite.y = 0;
                
                this.castleContainer = new Container();
                this.castleContainer.x = x;
                this.castleContainer.y = y;
                
                this.castlePosition.set(x, y);
                
                this.energyBar.clear();
                this.castleContainer.addChild(this.castleSprite);
                this.castleContainer.addChild(this.energyBar);
                
                this.container.addChild(this.castleContainer);

            } else if (struct.type === 'RESOURCE_NODE' || struct.type === 'BUSH' || struct.type === 'GENERIC' || struct.type === 'COOKIE') {
                let tex;
                let tint = CONFIG.RESOURCE_NODE_COLOR;

                if (struct.type === 'BUSH') {
                    tex = TextureFactory.getBushTexture(this.app.renderer);
                    tint = 0x006400;
                } else if (struct.type === 'COOKIE') {
                    tex = TextureFactory.getCookieTexture(this.app.renderer);
                    tint = 0xD2B48C; // Tan
                } else {
                    tex = TextureFactory.getTrapezoidTexture(this.app.renderer);
                }
                
                const sprite = new Sprite(tex);
                sprite.anchor.set(0.5);
                sprite.tint = tint;
                sprite.x = x;
                sprite.y = y;
                sprite.rotation = CONFIG.RESOURCE_NODE_ROTATION;

                this.sources.push({
                    sprite,
                    type: struct.type,
                    health: struct.health || 100,
                    x,
                    y
                });
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

    public getNestPosition(): Point {
        if (this.sinkType === 'NEST' || this.sinkType === 'CASTLE') {
            return this.castlePosition;
        }
        return new Point(this.app.screen.width / 2, this.app.screen.height / 2);
    }

    public getSinkType(): 'CASTLE' | 'CRUCIBLE' | 'NEST' | 'NONE' {
        return this.sinkType;
    }

    public isInside(x: number, y: number): boolean {
        return this.isNearSource(x, y);
    }

    public isNearSource(x: number, y: number, radius: number = 40): boolean {
        const rSq = (CONFIG.RESOURCE_NODE_RADIUS + radius)**2;
        
        for (const s of this.sources) {
            const dx = x - s.x;
            const dy = y - s.y;
            if (dx*dx + dy*dy < rSq) return true;
        }
        return false;
    }

    public damageStructure(type: string, x: number, y: number, amount: number): boolean {
        const rSq = (CONFIG.RESOURCE_NODE_RADIUS + 20)**2;
        
        for (const s of this.sources) {
            if (s.type === type) {
                const dx = s.x - x;
                const dy = s.y - y;
                if (dx*dx + dy*dy < rSq) {
                    s.health -= amount;
                    s.sprite.tint = 0xFFFFFF; 
                    setTimeout(() => {
                        if (s.type === 'COOKIE') s.sprite.tint = 0xD2B48C;
                        else if (s.type === 'BUSH') s.sprite.tint = 0x006400;
                        else s.sprite.tint = CONFIG.RESOURCE_NODE_COLOR;
                    }, 50);
                    return true;
                }
            }
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