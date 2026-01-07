import { Application, Container, Graphics } from 'pixi.js';
import { WorldState } from '../core/WorldState';
import { Pathfinder, RailNode } from '../logic/Pathfinder';
import { StructureType } from '../data/StructureData';
import { CONFIG } from '../core/Config';

export class RailSystem {
    private app: Application;
    private container: Container;
    private graphics: Graphics;
    private needsRedraw: boolean = false;

    constructor(app: Application) {
        this.app = app;
        this.container = new Container();
        this.graphics = new Graphics();
        this.container.addChild(this.graphics);
        this.app.stage.addChild(this.container);

        window.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 't') {
                this.needsRedraw = true;
            }
        });
    }

    public update(world: WorldState) {
        if (this.needsRedraw) {
            const nest = world.structures.find(s => s.type === StructureType.NEST);
            const cookie = world.structures.find(s => s.type === StructureType.COOKIE);

            if (nest && cookie) {
                // Ensure grid is fresh
                world.refreshGrid();
                const grid = world.grid;

                // Hack: Unblock start/end
                const cxStart = Math.floor(nest.x / CONFIG.GRID_SIZE);
                const cyStart = Math.floor(nest.y / CONFIG.GRID_SIZE);
                const cxEnd = Math.floor(cookie.x / CONFIG.GRID_SIZE);
                const cyEnd = Math.floor(cookie.y / CONFIG.GRID_SIZE);
                
                if (cxStart >= 0 && cxStart < grid.cols && cyStart >= 0 && cyStart < grid.rows) {
                    grid.data[cyStart * grid.cols + cxStart] = 0;
                }
                 if (cxEnd >= 0 && cxEnd < grid.cols && cyEnd >= 0 && cyEnd < grid.rows) {
                    grid.data[cyEnd * grid.cols + cxEnd] = 0;
                }

                console.log("Pathfinding (A* Blocky)...");
                const rawPath = Pathfinder.findPath(nest.x, nest.y, cookie.x, cookie.y, grid);
                
                if (rawPath.length > 0) {
                     world.rail = rawPath;
                     this.drawRail(world.rail);
                     console.log(`Rail generated: ${rawPath.length} nodes.`);
                } else {
                    console.log("No path found.");
                }
            }
            this.needsRedraw = false;
        }
    }

    private drawRail(rail: RailNode[]) {
        const g = this.graphics;
        g.clear();
        if (rail.length < 2) return;

        // Draw "Road" style: Blocky, 16px wide
        g.moveTo(rail[0].x, rail[0].y);
        for (let i = 1; i < rail.length; i++) {
            g.lineTo(rail[i].x, rail[i].y);
        }
        
        // 16px wide, Grey road
        g.stroke({ width: 16, color: 0x555555, alpha: 1.0, cap: 'square', join: 'bevel' });
        
        // Optional: Draw center line
        /*
        g.moveTo(rail[0].x, rail[0].y);
        for (let i = 1; i < rail.length; i++) {
            g.lineTo(rail[i].x, rail[i].y);
        }
        g.stroke({ width: 2, color: 0xFFFFFF, alpha: 0.5 });
        */
    }
}
