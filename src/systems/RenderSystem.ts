import { Application, Graphics, Container, Text, TextStyle } from 'pixi.js';
import { WorldState } from '../core/WorldState';
import { CONFIG } from '../core/Config';
import { getStructureStats, StructureType } from '../data/StructureData';
import { InputState } from '../core/InputState';
import { Terrain } from '../data/MapData';
import { ToolManager } from '../tools/ToolManager';
import { StructureRenderer } from './render/StructureRenderer';
import { SprigRenderer } from './render/SprigRenderer';
import { PathRenderer } from './render/PathRenderer';
import { JobType } from '../data/JobData';

export class RenderSystem {
    private world: WorldState;
    private toolManager: ToolManager;
    
    private gridGraphics: Graphics;
    private structureGraphics: Graphics;
    private debugGraphics: Graphics;
    private hoverGraphics: Graphics;
    private spriteContainer: Container;
    private labelContainer: Container;
    
    private structureRenderer: StructureRenderer;
    private sprigRenderer: SprigRenderer;
    private pathRenderer: PathRenderer;
    
    private structureLabels: Map<number, Text> = new Map();
    private needsRedraw: boolean = true;
    public activeTool: string = '';

    constructor(app: Application, world: WorldState, toolManager: ToolManager) {
        this.world = world;
        this.toolManager = toolManager;
        
        this.gridGraphics = new Graphics();
        this.structureGraphics = new Graphics();
        this.spriteContainer = new Container();
        this.debugGraphics = new Graphics();
        this.labelContainer = new Container();
        this.hoverGraphics = new Graphics();
        
        app.stage.addChild(this.gridGraphics);
        app.stage.addChild(this.structureGraphics);
        app.stage.addChild(this.spriteContainer);
        app.stage.addChild(this.debugGraphics);
        app.stage.addChild(this.labelContainer);
        app.stage.addChild(this.hoverGraphics);
        
        this.structureRenderer = new StructureRenderer();
        this.sprigRenderer = new SprigRenderer();
        this.pathRenderer = new PathRenderer();
    }

    public update() {
        this.debugGraphics.clear();

        if (this.needsRedraw || this.world.terrainDirty) {
            this.drawTerrain();
            this.needsRedraw = false;
            this.world.terrainDirty = false;
        }

        this.structureRenderer.draw(this.structureGraphics, this.world);
        this.pathRenderer.draw(this.debugGraphics, this.world);
        this.toolManager.drawActiveToolPreview(this.debugGraphics, this.world);
        this.sprigRenderer.update(this.spriteContainer, this.debugGraphics, this.world);
        
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
            const color = this.activeTool === 'ERASER' ? 0xFF0000 : 0xFFFFFF;
            const radius = this.activeTool === 'ERASER' ? CONFIG.ERASER_RADIUS : CONFIG.TERRAIN_RADIUS;
            g.circle(x, y, radius).stroke({ width: 2, color });
        } else if (this.activeTool === 'COMMAND') {
            g.circle(x, y, CONFIG.COMMAND_RADIUS).stroke({ width: 2, color: 0x00FFFF });
            g.circle(x, y, CONFIG.COMMAND_RADIUS).fill({ color: 0x00FFFF, alpha: 0.1 });
        } else {
            const col = this.world.grid.getCol(x);
            const row = this.world.grid.getRow(y);
            if (this.world.grid.isValid(col, row)) {
                const size = CONFIG.GRID_SIZE;
                g.rect(col * size, row * size, size, size).stroke({ width: 2, color: 0x00FF00 });
            }
        }
    }

    private drawDebugVectors() {
        if (!CONFIG.DEBUG_SPRIG_VECTORS) return;
        const g = this.debugGraphics;
        const sprigs = this.world.sprigs;

        for (let i = 0; i < CONFIG.MAX_SPRIGS; i++) {
            if (sprigs.active[i] === 0) continue;
            const x = sprigs.x[i];
            const y = sprigs.y[i];

            g.moveTo(x, y).lineTo(x + sprigs.vx[i] * 0.5, y + sprigs.vy[i] * 0.5).stroke({ width: 2, color: 0x0000FF });
            g.moveTo(x, y).lineTo(x + sprigs.debugAx[i] * 0.5, y + sprigs.debugAy[i] * 0.5).stroke({ width: 2, color: 0xFFFF00 });

            const homeId = sprigs.homeID[i];
            if (homeId !== -1) {
                const home = this.world.structures.find(s => s.id === homeId);
                if (home) {
                    const dist = Math.sqrt((x - home.x)**2 + (y - home.y)**2);
                    const color = dist < CONFIG.NEST_VIEW_RADIUS ? 0x00FF00 : 0xFFA500; // Orange
                    g.moveTo(x, y).lineTo(home.x, home.y).stroke({ width: 1, color, alpha: 0.5 });
                }
            }

            // Patrol Line
            const jobId = sprigs.jobId[i];
            if (jobId !== -1 && this.world.jobs.type[jobId] === JobType.PATROL) {
                const targetId = this.world.jobs.targetId[jobId];
                const flag = this.world.structures.find(s => s.id === targetId);
                if (flag) {
                    g.moveTo(x, y).lineTo(flag.x, flag.y).stroke({ width: 2, color: 0xFF0000, alpha: 0.8 });
                }
            }

            if (sprigs.targetX[i] + sprigs.targetY[i] > 0) {
                g.moveTo(x, y).lineTo(sprigs.targetX[i], sprigs.targetY[i]).stroke({ width: 1, color: 0xFF00FF });
            }
        }
    }

    private drawStructureLabels() {
        if (!CONFIG.DEBUG_STRUCTURE_LABELS) {
            this.labelContainer.visible = false;
            return;
        }
        this.labelContainer.visible = true;

        for (const [id, text] of this.structureLabels) {
            if (!this.world.structures.find(s => s.id === id)) {
                this.labelContainer.removeChild(text);
                text.destroy();
                this.structureLabels.delete(id);
            }
        }

        for (const s of this.world.structures) {
            let text = this.structureLabels.get(s.id);
            if (!text) {
                text = new Text({ text: '', style: new TextStyle({ fontFamily: 'monospace', fontSize: 12, fill: '#ffffff', stroke: { color: '#000000', width: 2 }})});
                this.labelContainer.addChild(text);
                this.structureLabels.set(s.id, text);
            }

            let content = `ID: ${s.id}\nType: ${getStructureStats(s.type).name}`;
            if (s.stock) {
                for (const [key, val] of s.stock.toJSON().inventory) {
                    if (val > 0) content += `\n${key}: ${val}`;
                }
            }
            if (s.type === StructureType.NEST) {
                let housing = 0;
                for(let i=0; i<this.world.sprigs.active.length; i++) {
                    if (this.world.sprigs.active[i] && this.world.sprigs.homeID[i] === s.id) housing++;
                }
                content += `\nHousing: ${housing}`;
                // Nest Radius Indicator
                this.debugGraphics.circle(s.x, s.y, CONFIG.NEST_VIEW_RADIUS).stroke({ width: 2, color: getStructureStats(s.type).color, alpha: CONFIG.SIGNAL_ALPHA });
            }
            if (s.type === StructureType.BURROW) {
                // Burrow Radius Indicator
                this.debugGraphics.circle(s.x, s.y, CONFIG.THIEF_LEASH_RADIUS).stroke({ width: 2, color: getStructureStats(s.type).color, alpha: CONFIG.SIGNAL_ALPHA });
            }

            text.text = content;
            text.x = s.x + 15;
            text.y = s.y - 15;
            this.debugGraphics.rect(text.x - 2, text.y - 2, text.width + 4, text.height + 4).fill({ color: 0x000000, alpha: 0.5 });
        }
    }

    private drawTerrain() {
        const g = this.gridGraphics;
        g.clear();
        const size = CONFIG.GRID_SIZE;
        const w = this.world.map.width;
        const h = this.world.map.height;

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const terrain = this.world.map.terrain[this.world.map.getIndex(x, y)];
                let color = 0x000000;
                if (terrain === Terrain.GRASS) color = 0x1a472a;
                if (terrain === Terrain.MUD) color = 0x5d4037;
                if (terrain === Terrain.WATER) color = 0x2196f3;
                g.rect(x * size, y * size, size, size).fill(color);
            }
        }

        const lineColor = 0x2e2e2e;
        for (let x = 0; x <= w; x++) g.moveTo(x * size, 0).lineTo(x * size, h * size);
        for (let y = 0; y <= h; y++) g.moveTo(0, y * size).lineTo(w * size, y * size);
        g.stroke({ width: 1, color: lineColor });
    }
}