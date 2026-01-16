import { ToolManager } from './ToolManager';
import { WorldState } from '../core/WorldState';
import { TOOL_NAMES, TOOL_ORDER } from './ToolConfig';
import { CONFIG } from '../core/Config';

export class Toolbar {
    private toolManager: ToolManager;
    private world: WorldState;
    private toolButtons: Record<string, HTMLDivElement> = {};
    private toolOptionIcons: Record<string, { val: number, el: HTMLDivElement }[]> = {};
    private lastActiveTool: string = '';
    private container: HTMLDivElement;

    constructor(toolManager: ToolManager, world: WorldState) {
        this.toolManager = toolManager;
        this.world = world;
        this.container = document.createElement('div');
        this.init();
    }

    private init() {
        this.container.style.position = 'absolute';
        this.container.style.top = '50%';
        this.container.style.left = '20px';
        this.container.style.transform = 'translateY(-50%)';
        this.container.style.display = 'flex';
        this.container.style.flexDirection = 'column';
        this.container.style.gap = '10px';
        this.container.style.zIndex = '100';
        document.body.appendChild(this.container);

        // Filter out Player Tools
        const DEV_TOOLS = TOOL_ORDER.filter(t => t !== 'SIGNAL' && t !== 'COMMAND');

        DEV_TOOLS.forEach(name => {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.gap = '5px';
            row.style.alignItems = 'center';

            // Main Tool Button
            const btn = document.createElement('div');
            btn.textContent = name;
            btn.style.backgroundColor = '#444';
            btn.style.color = 'white';
            btn.style.padding = '10px 0';
            btn.style.border = '1px solid #555';
            btn.style.borderRadius = '5px';
            btn.style.cursor = 'pointer';
            btn.style.fontFamily = 'monospace';
            btn.style.userSelect = 'none';
            btn.style.textAlign = 'center';
            btn.style.width = '80px';
            
            btn.addEventListener('pointerdown', (e) => {
                e.stopPropagation();
                this.toolManager.setTool(name);
            });

            row.appendChild(btn);
            this.toolButtons[name] = btn;

            const options = this.toolManager.getToolAvailableOptions(name);
            if (options && options.length > 0) {
                const optionsDiv = document.createElement('div');
                optionsDiv.style.display = 'flex';
                optionsDiv.style.gap = '2px';
                this.toolOptionIcons[name] = [];

                options.forEach(opt => {
                    const icon = document.createElement('div');
                    icon.style.width = '20px';
                    icon.style.height = '20px';
                    icon.style.backgroundColor = opt.color;
                    icon.style.border = '1px solid #fff';
                    icon.style.cursor = 'pointer';
                    icon.title = opt.name;
                    
                    if (name === TOOL_NAMES.BUILD) {
                        icon.style.borderRadius = '50%';
                    }

                    icon.addEventListener('pointerdown', (e) => {
                        e.stopPropagation();
                        this.toolManager.setTool(name);
                        this.toolManager.setToolOption(name, opt.value);
                    });
                    optionsDiv.appendChild(icon);
                    this.toolOptionIcons[name].push({ val: opt.value, el: icon });
                });
                row.appendChild(optionsDiv);
            }

            this.container.appendChild(row);
        });

        this.addCopyButton();
        this.addDebugToggle();
    }

    private addDebugToggle() {
        const toggleRow = document.createElement('div');
        toggleRow.style.display = 'flex';
        toggleRow.style.alignItems = 'center';
        toggleRow.style.gap = '5px';
        toggleRow.style.marginTop = '10px';
        toggleRow.style.color = 'white';
        toggleRow.style.fontFamily = 'monospace';
        toggleRow.style.fontSize = '12px';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = CONFIG.DEBUG_SPRIG_VECTORS;
        checkbox.style.cursor = 'pointer';

        checkbox.addEventListener('change', (e) => {
            CONFIG.DEBUG_SPRIG_VECTORS = (e.target as HTMLInputElement).checked;
        });

        const label = document.createElement('label');
        label.textContent = 'VECTORS';
        label.style.cursor = 'pointer';
        label.addEventListener('click', () => checkbox.click());

        toggleRow.appendChild(checkbox);
        toggleRow.appendChild(label);

        // Labels Toggle
        const checkbox2 = document.createElement('input');
        checkbox2.type = 'checkbox';
        checkbox2.checked = CONFIG.DEBUG_STRUCTURE_LABELS;
        checkbox2.style.cursor = 'pointer';
        checkbox2.style.marginLeft = '10px';

        checkbox2.addEventListener('change', (e) => {
            CONFIG.DEBUG_STRUCTURE_LABELS = (e.target as HTMLInputElement).checked;
        });

        const label2 = document.createElement('label');
        label2.textContent = 'LABELS';
        label2.style.cursor = 'pointer';
        label2.addEventListener('click', () => checkbox2.click());

        toggleRow.appendChild(checkbox2);
        toggleRow.appendChild(label2);

        this.container.appendChild(toggleRow);
    }

    private addCopyButton() {
        const copyBtn = document.createElement('div');
        copyBtn.textContent = 'COPY JSON';
        copyBtn.style.backgroundColor = '#2196F3';
        copyBtn.style.color = 'white';
        copyBtn.style.padding = '10px 0';
        copyBtn.style.border = '1px solid #1976D2';
        copyBtn.style.borderRadius = '5px';
        copyBtn.style.cursor = 'pointer';
        copyBtn.style.fontFamily = 'monospace';
        copyBtn.style.userSelect = 'none';
        copyBtn.style.textAlign = 'center';
        copyBtn.style.width = '80px';
        copyBtn.style.marginTop = '10px';

        copyBtn.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            const data = this.world.serialize();
            console.log(data);
            navigator.clipboard.writeText(data).then(() => {
                alert("Level JSON copied!");
            }).catch(err => {
                console.error("Failed to copy", err);
            });
        });

        this.container.appendChild(copyBtn);
    }

    public update() {
        const active = this.toolManager.getActiveToolName();
        
        // Update Main Buttons
        if (active !== this.lastActiveTool) {
            this.lastActiveTool = active;
            for (const name in this.toolButtons) {
                const btn = this.toolButtons[name];
                if (name === active) {
                    btn.style.backgroundColor = '#4CAF50';
                    btn.style.borderColor = '#66BB6A';
                } else {
                    btn.style.backgroundColor = '#444';
                    btn.style.borderColor = '#555';
                }
            }
        }

        // Update Option Icons (Highlight selected)
        const currentOptionName = this.toolManager.getToolOption(active); 
        
        const options = this.toolManager.getToolAvailableOptions(active);
        if (options && this.toolOptionIcons[active]) {
             // We can iterate indices assuming order is preserved? Safe enough for now.
             this.toolOptionIcons[active].forEach((iconObj, index) => {
                 const opt = options[index]; // Assuming static list
                 let match = false;
                 if (opt.name === currentOptionName) match = true;
                 
                 if (match) {
                    iconObj.el.style.borderColor = '#FFFF00';
                    iconObj.el.style.transform = 'scale(1.2)';
                    iconObj.el.style.zIndex = '10';
                 } else {
                    iconObj.el.style.borderColor = '#fff';
                    iconObj.el.style.transform = 'scale(1.0)';
                    iconObj.el.style.zIndex = '0';
                 }
             });
        }
    }
}
