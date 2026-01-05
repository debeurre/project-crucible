import { Application, Graphics, Container } from 'pixi.js';
import { WorldState } from '../core/WorldState';
import { CONFIG } from '../core/Config';
import { StructureType } from '../data/StructureData';

export class RenderSystem {
    private app: Application;
    private world: WorldState;
    private gridGraphics: Graphics;
    private roadGraphics: Graphics;
    private scentGraphics: Graphics;
    private structureGraphics: Graphics;
    private sprigGraphics: Graphics;
    private container: Container;
    private needsRedraw: boolean = true;
    private lastStructureCount: number = 0;

    constructor(app: Application, world: WorldState) {
        this.app = app;
        this.world = world;
        this.container = new Container();
        this.gridGraphics = new Graphics();
        this.roadGraphics = new Graphics(); // Bottom layer
        this.scentGraphics = new Graphics(); 
        this.structureGraphics = new Graphics();
        this.sprigGraphics = new Graphics();
        
        this.container.addChild(this.gridGraphics);
        this.container.addChild(this.roadGraphics);
        this.container.addChild(this.scentGraphics);
        this.container.addChild(this.structureGraphics);
        this.container.addChild(this.sprigGraphics);
        this.app.stage.addChild(this.container);
    }

    public update() {
        if (this.needsRedraw) {
            this.drawGrid();
            this.drawStructures(); 
            this.needsRedraw = false;
            this.lastStructureCount = this.world.structures.length;
        }

        // Trigger redraw if structures changed
        if (this.world.structures.length !== this.lastStructureCount) {
            this.drawStructures();
            this.lastStructureCount = this.world.structures.length;
        }

        this.drawRoads();
        this.drawScents();
        this.drawSprigs();
    }

    private drawRoads() {
        const g = this.roadGraphics;
        g.clear();
        
        if (!this.world.map.roads) return;

        const roads = this.world.map.roads;
        const width = this.world.map.width;
        const height = this.world.map.height;
        const tileSize = CONFIG.TILE_SIZE;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = y * width + x;
                const val = roads[i];
                if (val > 0.1) {
                    g.rect(x * tileSize, y * tileSize, tileSize, tileSize)
                     .fill({ color: 0x8B4513, alpha: val });
                }
            }
        }
    }

    private drawScents() {
        const g = this.scentGraphics;
        g.clear();
        
        if (!this.world.map.scents) return;

        const scents = this.world.map.scents;
        const width = this.world.map.width;
        const height = this.world.map.height;
        const tileSize = CONFIG.TILE_SIZE;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = y * width + x;
                const val = scents[i];
                if (val > 0.05) {
                    g.rect(x * tileSize, y * tileSize, tileSize, tileSize)
                     .fill({ color: 0x00FF00, alpha: val * 0.5 });
                }
            }
        }
    }

    private drawGrid() {
        const g = this.gridGraphics;
        g.clear();

        const tileSize = CONFIG.TILE_SIZE;
        const width = this.world.map.width * tileSize;
        const height = this.world.map.height * tileSize;

        // Background
        g.rect(0, 0, width, height).fill(0x2e2e2e);

        // Grid Lines
        const lineColor = 0x3e3e3e;
        
        // Vertical lines
        for (let x = 0; x <= this.world.map.width; x++) {
            g.moveTo(x * tileSize, 0);
            g.lineTo(x * tileSize, height);
        }

        // Horizontal lines
        for (let y = 0; y <= this.world.map.height; y++) {
            g.moveTo(0, y * tileSize);
            g.lineTo(width, y * tileSize);
        }

        g.stroke({ width: 1, color: lineColor });
    }

    private drawStructures() {
        const g = this.structureGraphics;
        g.clear();

        for (const s of this.world.structures) {
            let color = 0xFFFFFF;
            if (s.type === StructureType.NEST) color = 0xFFD700; // Gold
            if (s.type === StructureType.COOKIE) color = 0xD2B48C; // Tan
            if (s.type === StructureType.ROCK) color = 0x808080; // Grey

            g.circle(s.x, s.y, s.radius).fill(color);
        }
    }

    private drawSprigs() {
        const g = this.sprigGraphics;
        g.clear();
        
        const sprigs = this.world.sprigs;
        const count = CONFIG.MAX_SPRIGS;

        for (let i = 0; i < count; i++) {
            if (sprigs.active[i] === 1) {
                const color = sprigs.cargo[i] === 1 ? 0xFF69B4 : 0x00FF00; // Pink if full, Green if empty
                g.circle(sprigs.x[i], sprigs.y[i], 3).fill(color);
            }
        }
    }
}
