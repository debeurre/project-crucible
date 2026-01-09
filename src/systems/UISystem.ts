import { Application, Text, TextStyle } from 'pixi.js';
import { WorldState } from '../core/WorldState';
import { InputState } from '../core/InputState';

export class UISystem {
    private app: Application;
    private statsText: Text;

    constructor(app: Application) {
        this.app = app;
        const style = new TextStyle({
            fontFamily: 'monospace',
            fontSize: 16,
            fill: '#ffffff',
            stroke: { color: '#000000', width: 4, join: 'round' },
        });

        this.statsText = new Text({ text: 'Initializing...', style });
        this.statsText.x = 10;
        this.statsText.y = 10;

        app.stage.addChild(this.statsText);
    }

    public update(world: WorldState) {
        // Count active sprigs
        let activeCount = 0;
        const active = world.sprigs.active;
        const len = active.length;
        for (let i = 0; i < len; i++) {
            if (active[i]) activeCount++;
        }
        
        const fps = Math.round(this.app.ticker.FPS);
        const mx = InputState.x;
        const my = InputState.y;
        const gx = world.grid.getCol(mx);
        const gy = world.grid.getRow(my);

        this.statsText.text = `FPS: ${fps} | Sprigs: ${activeCount} | Food: ${world.foodStored}\nWorld: ${mx.toFixed(0)}, ${my.toFixed(0)}\nGrid: [${gx}, ${gy}]`;
    }
}
