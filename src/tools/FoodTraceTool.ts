import { ITool } from './ITool';
import { TraceSystem, TraceType } from '../systems/TraceSystem';
import { Graphics, Ticker } from 'pixi.js';
import { CONFIG } from '../config';
import { SprigSystem } from '../SprigSystem';

export class FoodTraceTool implements ITool {
    private traceSystem: TraceSystem;
    private sprigSystem: SprigSystem;

    constructor(traceSystem: TraceSystem, sprigSystem: SprigSystem) {
        this.traceSystem = traceSystem;
        this.sprigSystem = sprigSystem;
    }

    public onActivate() {}
    public onDeactivate() {}

    public onDown(x: number, y: number) {
        // Apply immediate buff to sprigs in range
        this.sprigSystem.applyDetectionBuff(
            x, 
            y, 
            CONFIG.TOOLS.FOOD_TRACE.RADIUS, 
            CONFIG.TOOLS.FOOD_TRACE.DURATION, 
            CONFIG.TOOLS.FOOD_TRACE.RADIUS // Buff amount = radius
        );
        
        // Also drop stationary trace for visual/nav aid (optional, but requested earlier)
        this.traceSystem.addTrace(x, y, TraceType.FOOD, CONFIG.TOOLS.FOOD_TRACE.RADIUS, CONFIG.TOOLS.FOOD_TRACE.DURATION, 0, 0);
    }

    public onHold(_x: number, _y: number, _ticker: Ticker) {}
    public onUp(_x: number, _y: number) {}
    public update(_ticker: Ticker) {}

    public renderCursor(g: Graphics, x: number, y: number) {
        const radius = CONFIG.TOOLS.FOOD_TRACE.RADIUS;
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