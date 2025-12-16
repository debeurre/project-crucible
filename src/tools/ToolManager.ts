import { ITool } from './ITool';
import { ToolMode, Toolbar } from '../ui/Toolbar';
import { PenTool } from './PenTool';
import { PencilTool } from './PencilTool';
import { EraserTool } from './EraserTool';
import { BrushTool } from './BrushTool';
import { OmniPencilTool } from './OmniPencilTool';
import { GraphSystem } from '../systems/GraphSystem';
import { FlowFieldSystem } from '../systems/FlowFieldSystem';
import { SprigSystem } from '../SprigSystem';
import { MovementPathSystem } from '../systems/MovementPathSystem';
import { Ticker } from 'pixi.js';
import { TaskIntent } from '../types/GraphTypes';

export class ToolManager {
    private tools: Record<ToolMode | 'OMNI', ITool>; // Added OMNI
    private activeToolMode: ToolMode | 'OMNI' = 'PENCIL';
    private activeTool: ITool;
    private toolbar: Toolbar;
    private activeIntent: TaskIntent = TaskIntent.GREEN_HARVEST; // Default

    constructor(
        graphSystem: GraphSystem, 
        flowFieldSystem: FlowFieldSystem, 
        sprigSystem: SprigSystem,
        movementPathSystem: MovementPathSystem, // New
        toolbar: Toolbar
    ) {
        this.toolbar = toolbar;
        
        this.tools = {
            'PENCIL': new PencilTool(flowFieldSystem),
            'PEN': new PenTool(graphSystem, toolbar, this),
            'ERASER': new EraserTool(flowFieldSystem, graphSystem, sprigSystem),
            'BRUSH': new BrushTool(flowFieldSystem, this),
            'OMNI': new OmniPencilTool(sprigSystem, movementPathSystem)
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

    public setTool(mode: ToolMode | 'OMNI') {
        if (this.activeToolMode === mode) {
             if (mode === 'PEN') {
                this.getPenTool().commit();
            }
            return;
        }

        this.activeTool.onDeactivate();
        this.activeToolMode = mode;
        this.activeTool = this.tools[mode];
        this.activeTool.onActivate();
        
        if (mode !== 'OMNI') {
            this.toolbar.setTool(mode);
        }
    }

    public getActiveToolMode(): ToolMode | 'OMNI' {
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

    public renderCursor(g: any, x: number, y: number) {
        this.activeTool.renderCursor(g, x, y);
    }
}
