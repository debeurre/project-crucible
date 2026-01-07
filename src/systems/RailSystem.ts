import { Application, Container, Graphics } from 'pixi.js';
import { WorldState } from '../core/WorldState';
import { Grid } from '../core/Grid';
import { Pathfinder, RailNode } from '../logic/Pathfinder';
import { StructureType } from '../data/StructureData';
import { CONFIG } from '../core/Config';

export class RailSystem {
    private app: Application;
    private container: Container;
    private graphics: Graphics;
    private grid: Grid;
    private currentRail: RailNode[] | null = null;
    private needsRedraw: boolean = false;

    constructor(app: Application) {
        this.app = app;
        this.container = new Container();
        this.graphics = new Graphics();
        this.container.addChild(this.graphics);
        this.app.stage.addChild(this.container);

        // Initialize Grid
        this.grid = new Grid(CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT);

        // Input listener for 'T'
        window.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 't') {
                this.generateTestRail();
            }
        });
    }

    private generateTestRail() {
        // Need access to world state logic here, usually passed in update or stored
        // But for event listener, we might not have it.
        // We can set a flag.
        this.needsRedraw = true;
    }

    public update(world: WorldState) {
        if (this.needsRedraw) {
            // Find Nest and Cookie
            const nest = world.structures.find(s => s.type === StructureType.NEST);
            const cookie = world.structures.find(s => s.type === StructureType.COOKIE);

            if (nest && cookie) {
                // Update Grid with current structures
                this.grid.update(world.structures);
                
                // Hack: Temporarily unblock start/end points in grid so pathfinder can enter/exit
                // Or better: Find valid point NEAR nest/cookie
                // For this test, let's try direct center-to-center.
                // If centers are blocked, we might need to "unblock" them manually in the grid logic or Pathfinder
                // Let's modify Grid logic locally or just accept that if radius covers center, it fails.
                
                // Hacky fix: Manually clear the start and end tiles in the grid
                const cxStart = Math.floor(nest.x / CONFIG.GRID_SIZE);
                const cyStart = Math.floor(nest.y / CONFIG.GRID_SIZE);
                const cxEnd = Math.floor(cookie.x / CONFIG.GRID_SIZE);
                const cyEnd = Math.floor(cookie.y / CONFIG.GRID_SIZE);
                
                // Access private cells? No, public.
                this.grid.cells[cyStart * this.grid.width + cxStart] = 0;
                this.grid.cells[cyEnd * this.grid.width + cxEnd] = 0;

                console.log(`Pathfinding from (${nest.x},${nest.y}) to (${cookie.x},${cookie.y})...`);
                this.currentRail = Pathfinder.findPath(nest.x, nest.y, cookie.x, cookie.y, this.grid);
                console.log(`Path found: ${this.currentRail.length} nodes.`);
            }

            this.needsRedraw = false;
            this.drawRail();
        }
    }

    private drawRail() {
        const g = this.graphics;
        g.clear();

        if (this.currentRail && this.currentRail.length > 0) {
            // Draw Dotted Line
            for (const node of this.currentRail) {
                g.circle(node.x, node.y, 2).fill(0x00FFFF); // Cyan dots
            }
        }
    }
}
