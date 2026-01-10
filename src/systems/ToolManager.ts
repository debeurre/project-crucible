import { Tool } from '../core/tools/Tool';
import { WorldState } from '../core/WorldState';
import { InputState } from '../core/InputState';
import { DragTool } from '../core/tools/DragTool';
import { TerrainTool } from '../core/tools/TerrainTool';
import { SpawnTool } from '../core/tools/SpawnTool';
import { BuildTool } from '../core/tools/BuildTool';
import { EraserTool } from '../core/tools/EraserTool';

export class ToolManager {
    private tools: Record<string, Tool>;
    private activeTool: Tool;
    private activeToolName: string;
    private wasDown: boolean = false;

    constructor(_world: WorldState) {
        this.tools = {
            'HAND': new DragTool(),
            'PAINT': new TerrainTool(),
            'SPAWN': new SpawnTool(),
            'BUILD': new BuildTool(),
            'ERASER': new EraserTool()
        };
        this.activeToolName = 'HAND';
        this.activeTool = this.tools['HAND'];
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
