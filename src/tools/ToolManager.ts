import { ITool } from './ITool';
import { ToolMode } from '../ui/Toolbar';
import { PenTool } from './PenTool';
import { PencilTool } from './PencilTool';
import { EraserTool } from './EraserTool';
import { GraphSystem } from '../systems/GraphSystem';
import { FlowFieldSystem } from '../systems/FlowFieldSystem';
import { SprigSystem } from '../SprigSystem';
import { Toolbar } from '../ui/Toolbar';
import { Ticker } from 'pixi.js';

export class ToolManager {
    private tools: Record<ToolMode, ITool>;
    private activeToolMode: ToolMode = 'PENCIL';
    private activeTool: ITool;
    private toolbar: Toolbar;

    constructor(
        graphSystem: GraphSystem, 
        flowFieldSystem: FlowFieldSystem, 
        sprigSystem: SprigSystem,
        toolbar: Toolbar
    ) {
        this.toolbar = toolbar;
        
        this.tools = {
            'PENCIL': new PencilTool(flowFieldSystem),
            'PEN': new PenTool(graphSystem, toolbar),
            'ERASER': new EraserTool(flowFieldSystem, graphSystem, sprigSystem)
        };
        
        this.activeTool = this.tools['PENCIL'];
    }

    public setTool(mode: ToolMode) {
        if (this.activeToolMode === mode) return;

        this.activeTool.onDeactivate();
        this.activeToolMode = mode;
        this.activeTool = this.tools[mode];
        this.activeTool.onActivate();
        
        this.toolbar.setTool(mode);
    }

    public getActiveToolMode(): ToolMode {
        return this.activeToolMode;
    }

    public getPenTool(): PenTool {
        return this.tools['PEN'] as PenTool;
    }

    // Input Delegation
    public onDown(x: number, y: number) {
        this.activeTool.onDown(x, y);
    }

    public onHold(x: number, y: number, ticker: Ticker) {
        this.activeTool.onHold(x, y, ticker);
    }

    public onUp(x: number, y: number) {
        this.activeTool.onUp(x, y);
    }

    public update(ticker: Ticker) {
        this.activeTool.update(ticker);
    }
}
