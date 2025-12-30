import { ITool } from './ITool';
import { TraceSystem, TraceType } from '../systems/TraceSystem';
import { Graphics, Ticker } from 'pixi.js';
import { CONFIG } from '../config';

export class FoodTraceTool implements ITool {
    private traceSystem: TraceSystem;

    constructor(traceSystem: TraceSystem) {
        this.traceSystem = traceSystem;
    }

    public onActivate() {}
    public onDeactivate() {}

    public onDown(x: number, y: number) {
        this.traceSystem.addTrace(x, y, TraceType.FOOD, 300, 30.0);
    }

    public onHold(_x: number, _y: number, _ticker: Ticker) {}
    public onUp(_x: number, _y: number) {}
    public update(_ticker: Ticker) {}

    public renderCursor(g: Graphics, x: number, y: number) {
        const radius = 300;
        const segments = 32;
        const step = (Math.PI * 2) / segments;
        const color = CONFIG.TRACE_COLORS[TraceType.FOOD];
        
        for (let i = 0; i < segments; i += 2) {
            const start = i * step;
            const end = (i + 1) * step;
            g.arc(x, y, radius, start, end);
            g.stroke({ width: 2, color, alpha: 0.5 });
        }
    }
}
