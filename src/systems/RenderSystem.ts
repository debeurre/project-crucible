import { Application, Graphics, Container } from 'pixi.js';
import { WorldState } from '../core/WorldState';
import { CONFIG } from '../core/Config';

export class RenderSystem {
    private app: Application;
    private world: WorldState;
    private gridGraphics: Graphics;
    private sprigGraphics: Graphics;
    private container: Container;
    private needsRedraw: boolean = true;

    constructor(app: Application, world: WorldState) {
        this.app = app;
        this.world = world;
        this.container = new Container();
        this.gridGraphics = new Graphics();
        this.sprigGraphics = new Graphics();
        
        this.container.addChild(this.gridGraphics);
        this.container.addChild(this.sprigGraphics);
        this.app.stage.addChild(this.container);
    }

    public update() {
        if (this.needsRedraw) {
            this.drawGrid();
            this.needsRedraw = false;
        }
        this.drawSprigs();
    }

    private drawSprigs() {
        const g = this.sprigGraphics;
        g.clear();
        
        const sprigs = this.world.sprigs;
        const count = CONFIG.MAX_SPRIGS;

        for (let i = 0; i < count; i++) {
            if (sprigs.active[i] === 1) {
                g.circle(sprigs.x[i], sprigs.y[i], 3);
            }
        }
        g.fill(0x00FF00);
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
}
