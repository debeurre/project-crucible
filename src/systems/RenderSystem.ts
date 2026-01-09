import { Application, Graphics, Container, Sprite } from 'pixi.js';
import { WorldState } from '../core/WorldState';
import { CONFIG } from '../core/Config';
import { StructureType } from '../data/StructureData';
import { TextureManager } from '../core/TextureManager';

export class RenderSystem {
    private app: Application;
    private world: WorldState;
    private gridGraphics: Graphics;
    private roadGraphics: Graphics;
    private scentGraphics: Graphics;
    private structureGraphics: Graphics;
    private obstacleDebugGraphics: Graphics;
    private spriteContainer: Container;
    private container: Container;
    private needsRedraw: boolean = true;
    private lastStructureCount: number = 0;
    private sprites: Map<number, Sprite> = new Map();

    constructor(app: Application, world: WorldState) {
        this.app = app;
        this.world = world;
        this.container = new Container();
        this.gridGraphics = new Graphics();
        this.roadGraphics = new Graphics(); 
        this.scentGraphics = new Graphics(); 
        this.structureGraphics = new Graphics();
        this.obstacleDebugGraphics = new Graphics();
        this.spriteContainer = new Container();
        
        this.container.addChild(this.gridGraphics);
        this.container.addChild(this.roadGraphics);
        this.container.addChild(this.structureGraphics);
        this.container.addChild(this.obstacleDebugGraphics); 
        this.container.addChild(this.scentGraphics);
        this.container.addChild(this.spriteContainer); 
        this.app.stage.addChild(this.container);
    }

    public update() {
        if (this.needsRedraw) {
            this.drawGrid();
            this.drawStructures(); 
            this.needsRedraw = false;
            this.lastStructureCount = this.world.structures.length;
        }

        if (this.world.structures.length !== this.lastStructureCount) {
            this.drawStructures();
            this.lastStructureCount = this.world.structures.length;
        }
        this.updateSprigs();
    }

    private updateSprigs() {
        const sprigs = this.world.sprigs;
        const count = CONFIG.MAX_SPRIGS;

        for (const [id, sprite] of this.sprites) {
            if (sprigs.active[id] === 0) {
                this.spriteContainer.removeChild(sprite);
                sprite.destroy();
                this.sprites.delete(id);
            }
        }

        for (let i = 0; i < count; i++) {
            if (sprigs.active[i] === 1) {
                let sprite = this.sprites.get(i);
                if (!sprite) {
                    sprite = new Sprite(TextureManager.sootTexture);
                    sprite.anchor.set(0.5);
                    this.spriteContainer.addChild(sprite);
                    this.sprites.set(i, sprite);
                }
                sprite.x = sprigs.x[i];
                sprite.y = sprigs.y[i];
                if (Math.abs(sprigs.vx[i]) > 0.01 || Math.abs(sprigs.vy[i]) > 0.01) {
                     sprite.rotation = Math.atan2(sprigs.vy[i], sprigs.vx[i]) + 1.57;
                }
                sprite.tint = sprigs.cargo[i] === 1 ? 0xFF69B4 : 0x00FF00;
                sprite.scale.set(0.6);
            }
        }
    }

    private drawGrid() {
        const g = this.gridGraphics;
        g.clear();
        const tileSize = CONFIG.TILE_SIZE;
        const width = this.world.map.width * tileSize;
        const height = this.world.map.height * tileSize;
        g.rect(0, 0, width, height).fill(0x1a1a1a); // Dark background
        const lineColor = 0x2e2e2e;
        for (let x = 0; x <= this.world.map.width; x++) {
            g.moveTo(x * tileSize, 0).lineTo(x * tileSize, height);
        }
        for (let y = 0; y <= this.world.map.height; y++) {
            g.moveTo(0, y * tileSize).lineTo(width, y * tileSize);
        }
        g.stroke({ width: 1, color: lineColor });
    }

    private drawStructures() {
        const g = this.structureGraphics;
        g.clear();
        for (const s of this.world.structures) {
            let color = 0xFFFFFF;
            if (s.type === StructureType.NEST) color = 0xFFD700;
            if (s.type === StructureType.COOKIE) color = 0xD2B48C;
            if (s.type === StructureType.ROCK) color = 0x808080;
            g.circle(s.x, s.y, s.radius).fill(color);
        }
    }
}