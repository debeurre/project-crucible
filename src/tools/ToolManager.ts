import { Tool, ToolOption } from './Tool';
import { WorldState } from '../core/WorldState';
import { InputState } from '../core/InputState';
import { DragTool } from './DragTool';
import { TerrainTool } from './TerrainTool';
import { SpawnTool } from './SpawnTool';
import { BuildTool } from './BuildTool';
import { EraserTool } from './EraserTool';
import { HarvestSignalTool } from './HarvestSignalTool';
import { CommandBrushTool } from './CommandBrushTool';
import { TOOL_NAMES } from './ToolConfig';

export class ToolManager {
    private tools: Record<string, Tool>;
    private activeTool: Tool;
    private activeToolName: string;
    private wasDown: boolean = false;

    constructor(_world: WorldState) {
        this.tools = {
            [TOOL_NAMES.HAND]: new DragTool(),
            [TOOL_NAMES.PAINT]: new TerrainTool(),
            [TOOL_NAMES.SPAWN]: new SpawnTool(),
            [TOOL_NAMES.BUILD]: new BuildTool(),
            [TOOL_NAMES.ERASER]: new EraserTool(),
            [TOOL_NAMES.SIGNAL]: new HarvestSignalTool(),
            [TOOL_NAMES.COMMAND]: new CommandBrushTool()
        };
        this.activeToolName = TOOL_NAMES.HAND;
        this.activeTool = this.tools[TOOL_NAMES.HAND];
    }

    public setTool(name: string) {
        if (this.tools[name]) {
            this.activeTool = this.tools[name];
            this.activeToolName = name;
            console.log(`Tool switched to: ${name}`);
        }
    }

    public getActiveToolName(): string {
        return this.activeToolName;
    }

    public cycleToolOption(name: string) {
        if (this.tools[name] && this.tools[name].cycleOption) {
            this.tools[name].cycleOption!();
        }
    }

    public setToolOption(name: string, value: number) {
        if (this.tools[name] && this.tools[name].setOption) {
            this.tools[name].setOption!(value);
        } else {
            console.warn(`Tool ${name} does not support setOption`);
        }
    }

    public getToolOption(name: string): string {
        if (this.tools[name] && this.tools[name].getOptionName) {
            return this.tools[name].getOptionName!();
        }
        return '';
    }

    public getToolAvailableOptions(name: string): ToolOption[] {
        if (this.tools[name] && this.tools[name].getAvailableOptions) {
            return this.tools[name].getAvailableOptions!();
        }
        return [];
    }

    public update(world: WorldState) {
        if (InputState.isDown) {
            if (!this.wasDown) {
                this.activeTool.onDown(world, InputState.x, InputState.y);
            } else {
                this.activeTool.onDrag(world, InputState.x, InputState.y);
            }
        } else if (this.wasDown) {
            this.activeTool.onUp(world, InputState.x, InputState.y);
        }

        this.wasDown = InputState.isDown;
    }
}