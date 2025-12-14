import { Ticker, Graphics } from 'pixi.js';
import { ITool } from './ITool';
import { FlowFieldSystem } from '../systems/FlowFieldSystem';
import { GraphSystem } from '../systems/GraphSystem';
import { SprigSystem } from '../SprigSystem';

export class EraserTool implements ITool {
    private flowFieldSystem: FlowFieldSystem;
    private graphSystem: GraphSystem;
    private sprigSystem: SprigSystem;
    private readonly RADIUS = 40;

    constructor(flowFieldSystem: FlowFieldSystem, graphSystem: GraphSystem, sprigSystem: SprigSystem) {
        this.flowFieldSystem = flowFieldSystem;
        this.graphSystem = graphSystem;
        this.sprigSystem = sprigSystem;
    }

    onActivate(): void {}
    onDeactivate(): void {}

    onDown(x: number, y: number): void {
        this.performErasure(x, y);
    }

    onHold(x: number, y: number, ticker: Ticker): void {
        this.performErasure(x, y);
    }

    onUp(x: number, y: number): void {}

    update(ticker: Ticker): void {}
    
    renderCursor(g: Graphics, x: number, y: number): void {
        g.circle(x, y, this.RADIUS).stroke({ width: 2, color: 0x000000 });
    }

    private performErasure(x: number, y: number) {
        this.flowFieldSystem.clearFlow(x, y); 
        this.graphSystem.removeElementsAt(x, y, this.RADIUS);
        this.sprigSystem.removeSprigsAt(x, y, this.RADIUS);
    }
}
