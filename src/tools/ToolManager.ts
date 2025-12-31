import { ITool } from './ITool';
import { ToolMode, Toolbar } from '../ui/Toolbar';
import { EraserTool } from './EraserTool';
import { OmniPencilTool } from './OmniPencilTool';
import { CommandBrushTool } from './CommandBrushTool';
import { FoodTraceTool } from './FoodTraceTool';
import { GraphSystem } from '../systems/GraphSystem';
import { FlowFieldSystem } from '../systems/FlowFieldSystem';
import { SprigSystem } from '../SprigSystem';
import { MovementPathSystem } from '../systems/MovementPathSystem';
import { ToolOverlaySystem } from '../systems/ToolOverlaySystem';
import { TraceSystem } from '../systems/TraceSystem';
import { Graphics, Ticker } from 'pixi.js';
import { TaskIntent } from '../types/GraphTypes';
import { ItemSystem } from '../systems/ItemSystem';

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
        movementPathSystem: MovementPathSystem,
        _toolOverlaySystem: ToolOverlaySystem,
        traceSystem: TraceSystem,
        itemSystem: ItemSystem,
        toolbar: Toolbar
    ) {
        this.toolbar = toolbar;
        
        this.tools = {
            'PENCIL': new OmniPencilTool(sprigSystem, movementPathSystem),
            'ERASER': new EraserTool(flowFieldSystem, graphSystem, sprigSystem, traceSystem, itemSystem),
            'COMMAND_BRUSH': new CommandBrushTool(sprigSystem, movementPathSystem),
            'FOOD_TRACE': new FoodTraceTool(traceSystem, sprigSystem)
        };
        
        this.activeToolMode = 'COMMAND_BRUSH';
        this.activeTool = this.tools['COMMAND_BRUSH'];
        this.toolbar.setTool(this.activeToolMode);
    }

    public setActiveIntent(intent: TaskIntent) {
        this.activeIntent = intent;
        this.toolbar.setActiveIntent(intent); 
    }

    public getActiveIntent(): TaskIntent {
        return this.activeIntent;
    }

    public setTool(mode: ToolMode) {
        if (this.activeToolMode === mode) {
            return;
        }

        this.activeTool.onDeactivate();
        this.activeToolMode = mode;
        this.activeTool = this.tools[mode];
        this.activeTool.onActivate();
        
        this.toolbar.setTool(mode);
    }

    public getActiveToolMode(): ToolMode {
        return this.activeToolMode;
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

    public renderCursor(g: Graphics, x: number, y: number) {
        this.activeTool.renderCursor(g, x, y);
    }
}