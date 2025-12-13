import { Ticker } from 'pixi.js';
import { ITool } from './ITool';
import { FlowFieldSystem } from '../systems/FlowFieldSystem';
import { ToolManager } from './ToolManager';

export class BrushTool implements ITool {
    private flowFieldSystem: FlowFieldSystem;
    private toolManager: ToolManager;
    private brushSize: number = 30; // Radius in pixels? Or cells?
    // Spec says cells within radius. FlowField works with cells.
    
    constructor(flowFieldSystem: FlowFieldSystem, toolManager: ToolManager) {
        this.flowFieldSystem = flowFieldSystem;
        this.toolManager = toolManager;
    }

    onActivate(): void {}
    onDeactivate(): void {}

    onDown(x: number, y: number): void {
        this.paint(x, y);
    }

    onHold(x: number, y: number, ticker: Ticker): void {
        this.paint(x, y);
    }

    onUp(x: number, y: number): void {}

    update(ticker: Ticker): void {}

    private paint(x: number, y: number) {
        const intent = this.toolManager.getActiveIntent();
        this.flowFieldSystem.paintIntent(x, y, intent);
    }
}
