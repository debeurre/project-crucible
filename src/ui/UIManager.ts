import './style.css';
import { ToolManager } from '../tools/ToolManager';
import { WorldState } from '../core/WorldState';
import { TOOL_NAMES, TOOL_ORDER } from '../tools/ToolConfig';
import { CONFIG } from '../core/Config';

export class UIManager {
    private toolManager: ToolManager;
    private world: WorldState;
    
    private devContainer: HTMLDivElement;
    private playerContainer: HTMLDivElement;
    
    private toolButtons: Record<string, HTMLDivElement> = {};
    private toolOptionIcons: Record<string, { val: number, el: HTMLDivElement }[]> = {};
    private toolOptionContainers: Record<string, HTMLDivElement> = {};
    private lastActiveTool: string = '';

    constructor(toolManager: ToolManager, world: WorldState) {
        this.toolManager = toolManager;
        this.world = world;
        
        this.devContainer = document.createElement('div');
        this.devContainer.className = 'ui-container dev-sidebar';
        
        this.playerContainer = document.createElement('div');
        this.playerContainer.className = 'ui-container player-toolbar';
        
        document.body.appendChild(this.devContainer);
        document.body.appendChild(this.playerContainer);
        
        this.init();
    }

    private init() {
        const PLAYER_TOOLS = [TOOL_NAMES.COMMAND, TOOL_NAMES.HARVEST, TOOL_NAMES.PATROL];
        const DEV_TOOLS = TOOL_ORDER.filter(name => !PLAYER_TOOLS.includes(name));

        // Build Dev Tools
        DEV_TOOLS.forEach(name => {
            const row = this.createToolRow(name);
            this.devContainer.appendChild(row);
        });

        this.addCopyButton(this.devContainer);
        this.addDebugToggles(this.devContainer);

        // Build Player Tools
        PLAYER_TOOLS.forEach(name => {
            const btn = this.createToolButton(name);
            this.playerContainer.appendChild(btn);
        });
    }

    private createToolRow(name: string): HTMLDivElement {
        const row = document.createElement('div');
        row.className = 'ui-row';

        const btn = this.createToolButton(name);
        row.appendChild(btn);

        const options = this.toolManager.getToolAvailableOptions(name);
        if (options && options.length > 0) {
            const optionsDiv = document.createElement('div');
            optionsDiv.className = 'ui-row';
            optionsDiv.style.display = (name === this.toolManager.getActiveToolName()) ? 'flex' : 'none';
            this.toolOptionContainers[name] = optionsDiv;
            this.toolOptionIcons[name] = [];

            options.forEach(opt => {
                const icon = document.createElement('div');
                icon.className = 'ui-option-icon';
                if (name === TOOL_NAMES.BUILD) icon.classList.add('circle');
                icon.style.backgroundColor = opt.color;
                icon.title = opt.name;
                
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

        return row;
    }

    private createToolButton(name: string): HTMLDivElement {
        const btn = document.createElement('div');
        btn.className = 'ui-button';
        btn.textContent = name;
        btn.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            this.toolManager.setTool(name);
        });
        this.toolButtons[name] = btn;
        return btn;
    }

    private addDebugToggles(container: HTMLElement) {
        const toggleRow = document.createElement('div');
        toggleRow.className = 'ui-toggle-row';

        const createToggle = (label: string, initial: boolean, onChange: (v: boolean) => void) => {
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.checked = initial;
            cb.addEventListener('change', (e) => onChange((e.target as HTMLInputElement).checked));
            
            const lb = document.createElement('label');
            lb.textContent = label;
            lb.style.cursor = 'pointer';
            lb.addEventListener('click', () => cb.click());
            
            toggleRow.appendChild(cb);
            toggleRow.appendChild(lb);
        };

        createToggle('VECTORS', CONFIG.DEBUG_SPRIG_VECTORS, v => CONFIG.DEBUG_SPRIG_VECTORS = v);
        createToggle('LABELS', CONFIG.DEBUG_STRUCTURE_LABELS, v => CONFIG.DEBUG_STRUCTURE_LABELS = v);

        container.appendChild(toggleRow);
    }

    private addCopyButton(container: HTMLElement) {
        const btn = document.createElement('div');
        btn.className = 'ui-copy-btn';
        btn.textContent = 'COPY JSON';
        btn.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(this.world.serialize())
                .then(() => alert("Level JSON copied!"))
                .catch(err => console.error(err));
        });
        container.appendChild(btn);
    }

    public update() {
        const active = this.toolManager.getActiveToolName();
        if (active !== this.lastActiveTool) {
            this.lastActiveTool = active;
            for (const name in this.toolButtons) {
                this.toolButtons[name].classList.toggle('active', name === active);
            }
            for (const name in this.toolOptionContainers) {
                this.toolOptionContainers[name].style.display = (name === active) ? 'flex' : 'none';
            }
        }

        const currentOptionName = this.toolManager.getToolOption(active);
        const options = this.toolManager.getToolAvailableOptions(active);
        if (options && this.toolOptionIcons[active]) {
            this.toolOptionIcons[active].forEach((iconObj, index) => {
                iconObj.el.classList.toggle('active', options[index].name === currentOptionName);
            });
        }
    }
}
