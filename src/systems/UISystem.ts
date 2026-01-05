import { Application, Text, TextStyle } from 'pixi.js';
import { WorldState } from '../core/WorldState';

export class UISystem {
    private statsText: Text;

    constructor(app: Application) {
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
        
        this.statsText.text = `Sprigs: ${activeCount} | Food: ${world.foodStored}`;
    }
}
