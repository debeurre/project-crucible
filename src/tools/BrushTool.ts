import { Ticker, Graphics } from 'pixi.js';
import { ITool } from './ITool';
import { FlowFieldSystem } from '../systems/FlowFieldSystem';
import { ToolManager } from './ToolManager';

export class BrushTool implements ITool {
    private flowFieldSystem: FlowFieldSystem;
    private toolManager: ToolManager;
    // Matching FlowFieldSystem logic: radiusSq = 6 (cell units)
    // Sqrt(6) * 20 = 2.45 * 20 = 49px
    private readonly BRUSH_PIXEL_RADIUS = 49;
    
    constructor(flowFieldSystem: FlowFieldSystem, toolManager: ToolManager) {
        this.flowFieldSystem = flowFieldSystem;
        this.toolManager = toolManager;
    }

    onActivate(): void {}
    onDeactivate(): void {}

    onDown(x: number, y: number): void {
        this.paint(x, y);
    }

    onHold(x: number, y: number, _ticker: Ticker): void {
        this.paint(x, y);
    }

    onUp(_x: number, _y: number): void {}

    update(_ticker: Ticker): void {}
    
    renderCursor(g: Graphics, x: number, y: number): void {
        g.circle(x, y, this.BRUSH_PIXEL_RADIUS).stroke({ width: 2, color: 0x000000 });
    }

    private paint(x: number, y: number) {
        const intent = this.toolManager.getActiveIntent();
        this.flowFieldSystem.paintIntent(x, y, intent);
    }
}
