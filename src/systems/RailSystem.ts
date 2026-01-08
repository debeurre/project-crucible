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
    private needsRedraw: boolean = true; // Default ON
    private isEnabled: boolean = true;
    private toggleRequest: boolean = false;
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
                this.toggleRequest = true;
            }
        });
    }

    public update(world: WorldState) {
        if (this.toggleRequest) {
            this.isEnabled = !this.isEnabled;
            this.toggleRequest = false;

            if (this.isEnabled) {
                this.needsRedraw = true;
                this.statusDiv.innerText = '[T] RAIL PATHING: REFRESHING...';
            } else {
                world.rail = []; // Clear rail to disable physics
                this.graphics.clear(); // Clear visuals
                this.statusDiv.innerText = '[T] RAIL PATHING: OFF';
                this.needsRedraw = false;
            }
        }

        if (this.isEnabled && this.needsRedraw) {
            const nest = world.structures.find(s => s.type === StructureType.NEST);
            const cookie = world.structures.find(s => s.type === StructureType.COOKIE);

            if (nest && cookie) {
                // Ensure grid is fresh
                world.refreshGrid();
                const grid = world.grid;

                // Determine start/end points at the edge of structures + buffer
                const dx = cookie.x - nest.x;
                const dy = cookie.y - nest.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                const dirX = dx / dist;
                const dirY = dy / dist;

                const startX = nest.x + dirX * (nest.radius + CONFIG.INTERACTION_BUFFER);
                const startY = nest.y + dirY * (nest.radius + CONFIG.INTERACTION_BUFFER);
                
                const endX = cookie.x - dirX * (cookie.radius + CONFIG.INTERACTION_BUFFER);
                const endY = cookie.y - dirY * (cookie.radius + CONFIG.INTERACTION_BUFFER);

                console.log("Pathfinding (A* Blocky)...");
                const rawPath = Pathfinder.findPath(startX, startY, endX, endY, grid);
                
                if (rawPath.length > 0) {
                     const smoothPath = Spline.smoothPath(rawPath, 10);
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

        // Dashed Tan Line: Circles every 12px
        for (let i = 0; i < rail.length - 1; i++) {
            const p1 = rail[i];
            const p2 = rail[i+1];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const steps = Math.ceil(dist / 12);
            
            for (let j = 0; j < steps; j++) {
                const t = j / steps;
                const x = p1.x + dx * t;
                const y = p1.y + dy * t;
                g.circle(x, y, 2).fill({ color: 0xD2B48C, alpha: 0.8 });
            }
        }
    }
}
