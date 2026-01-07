import { Application, Container, Graphics } from 'pixi.js';
import { WorldState } from '../core/WorldState';
import { Pathfinder, RailNode } from '../logic/Pathfinder';
import { Spline } from '../logic/Spline';
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

                console.log("Pathfinding...");
                const rawPath = Pathfinder.findPath(nest.x, nest.y, cookie.x, cookie.y, grid);
                
                if (rawPath.length > 0) {
                     const smoothPath = Spline.generateSmoothPath(rawPath, 20); // High res for smoothness
                     world.rail = smoothPath;
                     this.drawRail(world.rail);
                     console.log(`Rail generated: ${smoothPath.length} smooth segments.`);
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

        g.moveTo(rail[0].x, rail[0].y);
        for (let i = 1; i < rail.length; i++) {
            g.lineTo(rail[i].x, rail[i].y);
        }
        g.stroke({ width: 6, color: 0x228B22, alpha: 0.8, cap: 'round', join: 'round' });
    }
}