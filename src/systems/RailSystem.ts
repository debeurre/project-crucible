import { Application, Container, Graphics } from 'pixi.js';
import { WorldState } from '../core/WorldState';
import { Pathfinder, RailNode } from '../logic/Pathfinder';
import { StructureType } from '../data/StructureData';
import { CONFIG } from '../core/Config';

export class RailSystem {
    private app: Application;
    private container: Container;
    private graphics: Graphics;
    private needsRedraw: boolean = true; // Default ON
    private statusDiv: HTMLDivElement;

    constructor(app: Application) {
        this.app = app;
        this.container = new Container();
        this.graphics = new Graphics();
        this.container.addChild(this.graphics);
        this.app.stage.addChild(this.container);

        // UI Feedback
        this.statusDiv = document.createElement('div');
        this.statusDiv.style.position = 'absolute';
        this.statusDiv.style.top = '10px';
        this.statusDiv.style.right = '10px';
        this.statusDiv.style.color = 'white';
        this.statusDiv.style.fontFamily = 'monospace';
        this.statusDiv.style.backgroundColor = 'rgba(0,0,0,0.5)';
        this.statusDiv.style.padding = '5px';
        this.statusDiv.innerText = '[T] RAIL PATHING: ON';
        document.body.appendChild(this.statusDiv);

        window.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 't') {
                this.needsRedraw = true;
                this.statusDiv.innerText = '[T] RAIL PATHING: REFRESHING...';
            }
        });
    }

    public update(world: WorldState) {
        if (this.needsRedraw) {
            const nest = world.structures.find(s => s.type === StructureType.NEST);
            const cookie = world.structures.find(s => s.type === StructureType.COOKIE);

            if (nest && cookie) {
                // ... (Grid refresh logic)
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
                     // Use Spline? "Phase 5... Rail Dominance... Blueprint for smooth splines" was Phase 4.
                     // Instructions for Phase 5 say: "Visual Overhaul... use PIXI.Graphics to draw a Dashed Tan Line... along the path nodes."
                     // Does it imply using Splines or Raw? 
                     // "Turn 5 blocky elbow turns into 50 tiny smooth segments" was Phase 3 (Spline).
                     // Phase 4 (A*) reverted to blocky.
                     // Phase 5 says "Rail Dominance". 
                     // "Instead of solid brown blocks (Phase 4), use ... Dashed Tan Line".
                     // Usually splines are preferred if available.
                     // But the instructions for Phase 4 said "This is the Blueprint".
                     // I will re-enable Spline generation because "Dashed Tan Line... along the path nodes" usually looks better smooth.
                     // But the instruction "draw small circles every 8px along the path nodes" implies iterating the path.
                     // If I use Spline, I have many nodes.
                     // I'll re-enable Spline for quality.
                     
                     // Wait, in Phase 4 I commented out Spline logic/imports? No, I overwrote the file.
                     // I need to re-import Spline if I use it.
                     // Or just draw the raw path dashed? 
                     // "Dashed Tan Line... along the path nodes".
                     // I'll stick to Raw Path if I don't want to restore Spline code (which I overwrote in Phase 4).
                     // Wait, I overwrote `RailSystem.ts` in Phase 4. `Spline.ts` file still exists.
                     // I should use `Spline` if I can. 
                     // But strictly following instructions: "Use lineStyle with a dash pattern or draw small circles every 8px along the path nodes."
                     // If I use the raw path, drawing circles every 8px requires interpolation between nodes.
                     
                     // I will check if `Spline.ts` is available and use it if possible for best visuals.
                     // But I'll stick to Raw Path if it's simpler, just drawing dashes between them.
                     // Actually, drawing a dashed line in Pixi v8 `graphics.poly(path).stroke({ dash: ... })`? 
                     // Pixi v8 Graphics might support native dash? `stroke({ width, color, dash: [10, 5] })`? 
                     // Pixi Graphics doesn't always support native dash in WebGL easily without plugins.
                     // Drawing circles is a safe fallback.
                     
                     // I'll use the circle method: Draw small circles at intervals.
                     // I will use Spline for smoothness.
                     
                     import { Spline } from '../logic/Spline'; // I need to add this import back.
                     
                     const smoothPath = Spline.generateSmoothPath(rawPath, 10);
                     world.rail = smoothPath;
                     this.drawRail(world.rail);
                     this.statusDiv.innerText = '[T] RAIL PATHING: ON';
                } else {
                    console.log("No path found.");
                    this.statusDiv.innerText = '[T] RAIL PATHING: FAILED';
                }
            }
            this.needsRedraw = false;
        }
    }

    private drawRail(rail: RailNode[]) {
        const g = this.graphics;
        g.clear();
        if (rail.length < 2) return;

        // Dashed Tan Line (Circles every 8px)
        // Iterate through rail segments
        for (let i = 0; i < rail.length - 1; i++) {
            const p1 = rail[i];
            const p2 = rail[i+1];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const steps = Math.ceil(dist / 8);
            
            for (let j = 0; j < steps; j++) {
                const t = j / steps;
                const x = p1.x + dx * t;
                const y = p1.y + dy * t;
                g.circle(x, y, 2).fill({ color: 0xD2B48C, alpha: 0.8 });
            }
        }
    }
}
