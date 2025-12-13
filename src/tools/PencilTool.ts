import { Ticker, Point } from 'pixi.js';
import { ITool } from './ITool';
import { FlowFieldSystem } from '../systems/FlowFieldSystem';

export class PencilTool implements ITool {
    private flowFieldSystem: FlowFieldSystem;
    private lastMousePos: Point | null = null;

    constructor(flowFieldSystem: FlowFieldSystem) {
        this.flowFieldSystem = flowFieldSystem;
    }

    onActivate(): void {
        this.lastMousePos = null;
    }

    onDeactivate(): void {
        this.lastMousePos = null;
    }

    onDown(x: number, y: number): void {
        this.lastMousePos = new Point(x, y);
    }

    onHold(x: number, y: number, ticker: Ticker): void {
        const dragVecX = x - (this.lastMousePos?.x ?? x);
        const dragVecY = y - (this.lastMousePos?.y ?? y);

        if (dragVecX !== 0 || dragVecY !== 0) {
             this.flowFieldSystem.paintManualFlow(x, y, dragVecX, dragVecY);
        }
        this.lastMousePos = new Point(x, y);
    }

    onUp(x: number, y: number): void {
        this.lastMousePos = null;
    }

    update(ticker: Ticker): void {}
}
