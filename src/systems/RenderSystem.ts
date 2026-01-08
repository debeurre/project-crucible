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
    private flowGraphics: Graphics;
    private spriteContainer: Container;
    private container: Container;
    private needsRedraw: boolean = true;
    private showFlowField: boolean = true; // Force render for debug
    private lastStructureCount: number = 0;
    private sprites: Map<number, Sprite> = new Map();

    constructor(app: Application, world: WorldState) {
        this.app = app;
        this.world = world;
        this.container = new Container();
        this.gridGraphics = new Graphics();
        this.roadGraphics = new Graphics(); // Bottom layer
        this.scentGraphics = new Graphics(); 
        this.structureGraphics = new Graphics();
        this.obstacleDebugGraphics = new Graphics();
        this.flowGraphics = new Graphics();
        this.spriteContainer = new Container();
        
        this.container.addChild(this.gridGraphics);
        this.container.addChild(this.roadGraphics);
        this.container.addChild(this.structureGraphics);
        this.container.addChild(this.obstacleDebugGraphics); // Debug overlay above structures
        this.container.addChild(this.flowGraphics); // Flow Field Debug
        this.container.addChild(this.scentGraphics);
        this.container.addChild(this.spriteContainer); // Add sprites above floor/scents
        this.app.stage.addChild(this.container);

        window.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 't') {
                this.showFlowField = !this.showFlowField;
            }
        });
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
        this.drawObstacleGrid();
        
        if (this.showFlowField) {
            this.drawFlowField();
        } else {
            this.flowGraphics.clear();
        }

        this.updateSprigs();
    }

    private drawFlowField() {
        const g = this.flowGraphics;
        g.clear();
        const field = this.world.flowField;
        if (!field) return;
        const res = field.resolution;
        
        for (let y = 0; y < field.height; y++) {
            for (let x = 0; x < field.width; x++) {
                const idx = (y * field.width + x) * 2;
                const vx = field.field[idx];
                const vy = field.field[idx+1];
                const len = Math.sqrt(vx*vx + vy*vy);
                
                if (len > 0.01) { // Show weak trails
                    const cx = x * res + res/2;
                    const cy = y * res + res/2;
                    g.moveTo(cx, cy);
                    g.lineTo(cx + vx * 20, cy + vy * 20); // Scale 20 for visibility
                }
            }
        }
        g.stroke({ width: 1, color: 0xFF0000, alpha: 0.5 }); // Red
    }

    private drawObstacleGrid() {
        const g = this.obstacleDebugGraphics;
        g.clear();
        const grid = this.world.grid;
        if (!grid) return;

        for (let y = 0; y < grid.rows; y++) {
            for (let x = 0; x < grid.cols; x++) {
                if (grid.data[y * grid.cols + x] === 1) {
                    g.rect(x * CONFIG.GRID_SIZE, y * CONFIG.GRID_SIZE, CONFIG.GRID_SIZE, CONFIG.GRID_SIZE)
                     .fill({ color: 0xFF0000, alpha: 0.3 });
                }
            }
        }
    }

    private updateSprigs() {
        const sprigs = this.world.sprigs;
        const count = CONFIG.MAX_SPRIGS;

        // 1. Prune dead sprites
        for (const [id, sprite] of this.sprites) {
            if (sprigs.active[id] === 0) {
                this.spriteContainer.removeChild(sprite);
                sprite.destroy();
                this.sprites.delete(id);
            }
        }

        // 2. Sync active sprigs
        for (let i = 0; i < count; i++) {
            if (sprigs.active[i] === 1) {
                let sprite = this.sprites.get(i);

                if (!sprite) {
                    sprite = new Sprite(TextureManager.sootTexture);
                    sprite.anchor.set(0.5); // Center anchor
                    this.spriteContainer.addChild(sprite);
                    this.sprites.set(i, sprite);
                }

                // Update Position
                sprite.x = sprigs.x[i];
                sprite.y = sprigs.y[i];

                // Update Rotation (align with velocity + 90 deg offset)
                if (Math.abs(sprigs.vx[i]) > 0.01 || Math.abs(sprigs.vy[i]) > 0.01) {
                     sprite.rotation = Math.atan2(sprigs.vy[i], sprigs.vx[i]) + 1.57;
                }

                // Tint
                if (sprigs.cargo[i] === 1) {
                    sprite.tint = 0xFF69B4; // Hot Pink
                } else {
                    sprite.tint = 0x00FF00; // Lime Green
                }
                
                // Scale
                sprite.scale.set(0.6);
            }
        }
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
}
