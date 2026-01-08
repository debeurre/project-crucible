import { Tool } from '../core/tools/Tool';
import { WorldState } from '../core/WorldState';
import { InputState } from '../core/InputState';

class DummyTool implements Tool {
    onDown(_world: WorldState, _x: number, _y: number): void {
        console.log("Tool Down");
    }
    onDrag(_world: WorldState, _x: number, _y: number): void {}
    onUp(_world: WorldState, _x: number, _y: number): void {}
}

export class ToolManager {
    private tools: Record<string, Tool>;
    private activeTool: Tool;
    private activeToolName: string;
    private wasDown: boolean = false;

    constructor(_world: WorldState) {
        this.tools = {
            'ROCK': new DummyTool(),
            'ERASER': new DummyTool(),
            'SCENT': new DummyTool()
        };
        this.activeToolName = 'SCENT';
        this.activeTool = this.tools['SCENT'];
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