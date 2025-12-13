import { ITool } from './ITool';
import { ToolMode, Toolbar } from '../ui/Toolbar';
import { PenTool } from './PenTool';
import { PencilTool } from './PencilTool';
import { EraserTool } from './EraserTool';
import { BrushTool } from './BrushTool';
import { GraphSystem } from '../systems/GraphSystem';
import { FlowFieldSystem } from '../systems/FlowFieldSystem';
import { SprigSystem } from '../SprigSystem';
import { Ticker } from 'pixi.js';
import { TaskIntent } from '../types/GraphTypes';

export class ToolManager {
    private tools: Record<ToolMode, ITool>;
    private activeToolMode: ToolMode = 'PENCIL';
    private activeTool: ITool;
    private toolbar: Toolbar;
    private activeIntent: TaskIntent = TaskIntent.GREEN_HARVEST; // Default

    constructor(
        graphSystem: GraphSystem, 
        flowFieldSystem: FlowFieldSystem, 
        sprigSystem: SprigSystem,
        toolbar: Toolbar
    ) {
        this.toolbar = toolbar;
        
        this.tools = {
            'PENCIL': new PencilTool(flowFieldSystem),
            'PEN': new PenTool(graphSystem, toolbar, this),
            'ERASER': new EraserTool(flowFieldSystem, graphSystem, sprigSystem),
            'BRUSH': new BrushTool(flowFieldSystem, this)
        };
        
        this.activeTool = this.tools['PENCIL'];
    }

    public setActiveIntent(intent: TaskIntent) {
        this.activeIntent = intent;
        this.toolbar.setActiveIntent(intent); // Sync UI
    }

    public getActiveIntent(): TaskIntent {
        return this.activeIntent;
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
