import { Application, Graphics, Container, Sprite, Text, TextStyle } from 'pixi.js';
import { WorldState } from '../core/WorldState';
import { CONFIG } from '../core/Config';
import { getStructureStats, StructureType } from '../data/StructureData';
import { TextureManager } from '../core/TextureManager';
import { InputState } from '../core/InputState';
import { Terrain } from '../data/MapData';

export class RenderSystem {
    private app: Application;
    private world: WorldState;
    private gridGraphics: Graphics;
    private structureGraphics: Graphics;
    private obstacleDebugGraphics: Graphics;
    private hoverGraphics: Graphics;
    private debugGraphics: Graphics;
    private spriteContainer: Container;
    private container: Container;
    private labelContainer: Container;
    private structureLabels: Map<number, Text> = new Map();
    private needsRedraw: boolean = true;
    private sprites: Map<number, Sprite> = new Map();
    public activeTool: string = '';

    constructor(app: Application, world: WorldState) {
        this.app = app;
        this.world = world;
        this.container = new Container();
        this.gridGraphics = new Graphics();
        this.structureGraphics = new Graphics();
        this.obstacleDebugGraphics = new Graphics();
        this.hoverGraphics = new Graphics();
        this.debugGraphics = new Graphics();
        this.spriteContainer = new Container();
        this.labelContainer = new Container();
        
        this.container.addChild(this.gridGraphics);
        this.container.addChild(this.structureGraphics);
        this.container.addChild(this.obstacleDebugGraphics); 
        this.container.addChild(this.spriteContainer); // Sprites below debug vectors
        this.container.addChild(this.debugGraphics);   // Debug vectors on top
        this.container.addChild(this.labelContainer);  // Labels on top of vectors
        this.container.addChild(this.hoverGraphics);   // UI/Cursor on very top
        
        this.app.stage.addChild(this.container);
    }

    public update() {
        if (this.needsRedraw || this.world.terrainDirty) {
            this.drawTerrain();
            this.needsRedraw = false;
            this.world.terrainDirty = false;
        }

        this.drawStructures();
        this.updateSprigs();
        
        this.debugGraphics.clear();
        this.drawDebugVectors();
        this.drawStructureLabels();
        
        this.drawHover();
    }

    private drawHover() {
        const g = this.hoverGraphics;
        g.clear();

        const x = InputState.x;
        const y = InputState.y;

        if (this.activeTool === 'PAINT' || this.activeTool === 'ERASER') {
            // Draw Brush Indicator
            const color = this.activeTool === 'ERASER' ? 0xFF0000 : 0xFFFFFF;
            const radius = this.activeTool === 'ERASER' ? CONFIG.ERASER_RADIUS : CONFIG.BRUSH_RADIUS;
            g.circle(x, y, radius).stroke({ width: 2, color });
        } else {
            // Draw Grid Highlight
            const col = this.world.grid.getCol(x);
            const row = this.world.grid.getRow(y);

            if (this.world.grid.isValid(col, row)) {
                const size = CONFIG.GRID_SIZE;
                g.rect(col * size, row * size, size, size)
                 .stroke({ width: 2, color: 0x00FF00 });
            }
        }
    }

    private drawDebugVectors() {
        if (!CONFIG.DEBUG_SPRIG_VECTORS) return;
        const g = this.debugGraphics;

        const sprigs = this.world.sprigs;
        const count = CONFIG.MAX_SPRIGS;

        for (let i = 0; i < count; i++) {
            if (sprigs.active[i] === 0) continue;

            const x = sprigs.x[i];
            const y = sprigs.y[i];

            // 1. Heading (Velocity) - Blue
            g.moveTo(x, y)
             .lineTo(x + sprigs.vx[i] * 0.5, y + sprigs.vy[i] * 0.5)
             .stroke({ width: 2, color: 0x0000FF });

            // 2. Net Force (Acceleration) - Yellow
            // Scale up for visibility
            g.moveTo(x, y)
             .lineTo(x + sprigs.debugAx[i] * 0.5, y + sprigs.debugAy[i] * 0.5)
             .stroke({ width: 2, color: 0xFFFF00 });

            // 3. Leash Line
            const homeId = sprigs.homeID[i];
            if (homeId !== -1) {
                const home = this.world.structures.find(s => s.id === homeId);
                if (home) {
                    const dx = x - home.x;
                    const dy = y - home.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    
                    const color = dist < CONFIG.NEST_VIEW_RADIUS ? 0x00FF00 : 0xFF0000;
                    g.moveTo(x, y)
                     .lineTo(home.x, home.y)
                     .stroke({ width: 1, color: color, alpha: 0.5 });
                }
            }

            // 4. Target Line - Purple
            if (sprigs.targetX[i] + sprigs.targetY[i] > 0) {
                g.moveTo(x, y)
                 .lineTo(sprigs.targetX[i], sprigs.targetY[i])
                 .stroke({ width: 1, color: 0xFF00FF });
            }
        }
    }

    private drawStructureLabels() {
        if (!CONFIG.DEBUG_STRUCTURE_LABELS) {
            this.labelContainer.visible = false;
            return;
        }
        this.labelContainer.visible = true;

        const structures = this.world.structures;
        
        // Remove labels for dead structures
        for (const [id, text] of this.structureLabels) {
            if (!structures.find(s => s.id === id)) {
                this.labelContainer.removeChild(text);
                text.destroy();
                this.structureLabels.delete(id);
            }
        }

        // Update/Create labels
        for (const s of structures) {
            let text = this.structureLabels.get(s.id);
            if (!text) {
                const style = new TextStyle({
                    fontFamily: 'monospace',
                    fontSize: 12,
                    fill: '#ffffff',
                    stroke: { color: '#000000', width: 2 }
                });
                text = new Text({ text: '', style });
                this.labelContainer.addChild(text);
                this.structureLabels.set(s.id, text);
            }

            // Build String
            let content = `ID: ${s.id}\nType: ${getStructureStats(s.type).name}`;
            if (s.stock) {
                const inventory = s.stock.toJSON().inventory; // [ [key, val], ... ]
                for (const [key, val] of inventory) {
                    if (val > 0) {
                        content += `\n${key}: ${val}`;
                    }
                }
            }
            if (s.type === StructureType.NEST) {
                let housing = 0;
                const sprigs = this.world.sprigs;
                for(let i=0; i<sprigs.active.length; i++) {
                    if (sprigs.active[i] && sprigs.homeID[i] === s.id) housing++;
                }
                content += `\nHousing: ${housing}`;
            }

            text.text = content;
            text.x = s.x + 15;
            text.y = s.y - 15;

            // Draw background rect in debugGraphics
            // Note: Text metrics are available but expensive to query every frame?
            // width/height of text object should be available.
            const w = text.width;
            const h = text.height;
            this.debugGraphics.rect(text.x - 2, text.y - 2, w + 4, h + 4).fill({ color: 0x000000, alpha: 0.5 });
        }
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
                sprite.tint = sprigs.stock[i].count('FOOD') > 0 ? 0xFF69B4 : 0x00FF00;
                
                // Calculate scale: Target Diameter / Texture Visual Diameter (36px)
                const scale = (CONFIG.SPRIG_RADIUS * 2) / 36;
                sprite.scale.set(scale);
            }
        }
    }

    private drawTerrain() {
        const g = this.gridGraphics;
        g.clear();
        const tileSize = CONFIG.GRID_SIZE;
        const width = this.world.map.width;
        const height = this.world.map.height;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const terrain = this.world.map.terrain[this.world.map.getIndex(x, y)];
                let color = 0x000000;
                if (terrain === Terrain.GRASS) color = 0x1a472a;
                if (terrain === Terrain.MUD) color = 0x5d4037;
                if (terrain === Terrain.WATER) color = 0x2196f3;
                
                g.rect(x * tileSize, y * tileSize, tileSize, tileSize).fill(color);
            }
        }

        // Grid Lines
        const pxWidth = width * tileSize;
        const pxHeight = height * tileSize;
        const lineColor = 0x2e2e2e;
        for (let x = 0; x <= width; x++) {
            g.moveTo(x * tileSize, 0).lineTo(x * tileSize, pxHeight);
        }
        for (let y = 0; y <= height; y++) {
            g.moveTo(0, y * tileSize).lineTo(pxWidth, y * tileSize);
        }
        g.stroke({ width: 1, color: lineColor });
    }

    private drawStructures() {
        const g = this.structureGraphics;
        g.clear();
        for (const s of this.world.structures) {
            const stats = getStructureStats(s.type);
            const color = stats.color;
            const radius = stats.radius;
            
            if (stats.shape === 'DIAMOND') {
                g.moveTo(s.x, s.y - radius) // Top
                 .lineTo(s.x + radius, s.y) // Right
                 .lineTo(s.x, s.y + radius) // Bottom
                 .lineTo(s.x - radius, s.y) // Left
                 .closePath()
                 .fill(color);
            } else {
                g.circle(s.x, s.y, radius).fill(color);
            }
        }
    }
}
