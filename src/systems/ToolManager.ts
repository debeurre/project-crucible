import { Tool } from './tools/Tool';
import { RockTool } from './tools/RockTool';
import { EraserTool } from './tools/EraserTool';
import { ScentTool } from './tools/ScentTool';
import { WorldState } from '../core/WorldState';
import { InputState } from '../core/InputState';

export class ToolManager {
    private tools: Record<string, Tool>;
    private activeTool: Tool;
    private activeToolName: string;
    private wasDown: boolean = false;

    constructor(_world: WorldState) { // World needed for initialization? No, just logic.
        this.tools = {
            'ROCK': new RockTool(),
            'ERASER': new EraserTool(),
            'SCENT': new ScentTool()
        };
        this.activeToolName = 'SCENT';
        this.activeTool = this.tools['SCENT']; // Default
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
