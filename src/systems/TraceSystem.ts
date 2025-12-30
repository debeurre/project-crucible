import { Container, Graphics, Ticker } from 'pixi.js';
import { ISystem } from './ISystem';

export enum TraceType {
    FOOD = 0,
    DANGER = 1,
    HOME = 2
}

interface Trace {
    id: number;
    x: number;
    y: number;
    type: TraceType;
    radius: number;
    duration: number;
    maxDuration: number;
}

export class TraceSystem implements ISystem {
    public container: Container;
    private graphics: Graphics;
    private traces: Trace[] = [];
    private nextId: number = 0;

    constructor() {
        this.container = new Container();
        this.graphics = new Graphics();
        this.container.addChild(this.graphics);
    }

    public addTrace(x: number, y: number, type: TraceType, radius: number, duration: number) {
        this.traces.push({
            id: this.nextId++,
            x,
            y,
            type,
            radius,
            duration,
            maxDuration: duration
        });
    }

    public getStrongestTrace(x: number, y: number, type: TraceType): Trace | null {
        let bestTrace: Trace | null = null;
        let bestDistSq = Infinity;

        for (const trace of this.traces) {
            if (trace.type !== type) continue;

            const dx = x - trace.x;
            const dy = y - trace.y;
            const distSq = dx * dx + dy * dy;

            if (distSq < trace.radius * trace.radius) {
                if (distSq < bestDistSq) {
                    bestDistSq = distSq;
                    bestTrace = trace;
                }
            }
        }
        return bestTrace;
    }

    public update(ticker: Ticker) {
        const dt = ticker.deltaTime / 60; // Seconds

        // Logic: Decay & Cull
        for (let i = this.traces.length - 1; i >= 0; i--) {
            const trace = this.traces[i];
            trace.duration -= dt;
            if (trace.duration <= 0) {
                this.traces.splice(i, 1);
            }
        }

        // Render
        this.graphics.clear();
        for (const trace of this.traces) {
            let color = 0xFFFFFF;
            switch (trace.type) {
                case TraceType.FOOD: color = 0x00FF00; break;
                case TraceType.DANGER: color = 0xFF0000; break;
                case TraceType.HOME: color = 0x0000FF; break;
            }

            const alpha = Math.max(0, trace.duration / trace.maxDuration);
            
            this.graphics.circle(trace.x, trace.y, trace.radius).fill({ color, alpha: alpha * 0.3 });
            this.graphics.circle(trace.x, trace.y, trace.radius).stroke({ width: 2, color, alpha: alpha });
        }
    }
    
    public clearAll() {
        this.traces = [];
        this.graphics.clear();
    }
}
