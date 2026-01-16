import { ToolManager } from './ToolManager';
import { TOOL_NAMES } from './ToolConfig';

export class PlayerControls {
    private toolManager: ToolManager;
    private container: HTMLDivElement;
    private buttons: Record<string, HTMLDivElement> = {};
    private lastActiveTool: string = '';

    constructor(toolManager: ToolManager) {
        this.toolManager = toolManager;
        this.container = document.createElement('div');
        this.init();
    }

    private init() {
        this.container.style.position = 'absolute';
        this.container.style.bottom = '20px';
        this.container.style.left = '50%';
        this.container.style.transform = 'translateX(-50%)';
        this.container.style.display = 'flex';
        this.container.style.gap = '10px';
        this.container.style.zIndex = '100';
        document.body.appendChild(this.container);

        const PLAYER_TOOLS = [TOOL_NAMES.SIGNAL, TOOL_NAMES.COMMAND];

        PLAYER_TOOLS.forEach(name => {
            const btn = document.createElement('div');
            btn.textContent = name;
            btn.style.backgroundColor = '#444';
            btn.style.color = 'white';
            btn.style.padding = '15px 25px';
            btn.style.border = '2px solid #555';
            btn.style.borderRadius = '8px';
            btn.style.cursor = 'pointer';
            btn.style.fontFamily = 'monospace';
            btn.style.fontSize = '16px';
            btn.style.fontWeight = 'bold';
            btn.style.userSelect = 'none';
            btn.style.textAlign = 'center';
            btn.style.minWidth = '100px';
            
            btn.addEventListener('pointerdown', (e) => {
                e.stopPropagation();
                this.toolManager.setTool(name);
            });

            this.container.appendChild(btn);
            this.buttons[name] = btn;
        });
    }

    public update() {
        const active = this.toolManager.getActiveToolName();
        
        if (active !== this.lastActiveTool) {
            this.lastActiveTool = active;
            for (const name in this.buttons) {
                const btn = this.buttons[name];
                if (name === active) {
                    btn.style.backgroundColor = '#2196F3'; // Blue for Player Tools
                    btn.style.borderColor = '#64B5F6';
                    btn.style.transform = 'translateY(-2px)';
                    btn.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
                } else {
                    btn.style.backgroundColor = '#444';
                    btn.style.borderColor = '#555';
                    btn.style.transform = 'translateY(0)';
                    btn.style.boxShadow = 'none';
                }
            }
        }
    }
}
