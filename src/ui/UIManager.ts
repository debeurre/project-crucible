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
    private modalContainer: HTMLDivElement | null = null;
    private sprigList: HTMLDivElement | null = null;
    
    private toolButtons: Record<string, HTMLDivElement> = {};
    private toolOptionIcons: Record<string, { val: number, el: HTMLDivElement }[]> = {};
    private toolOptionContainers: Record<string, HTMLDivElement> = {};
    private lastActiveTool: string = '';
    private frameCount: number = 0;
    private isModalOpen: boolean = false;

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
        this.addStatsToggleButton(this.devContainer);
        this.addDebugToggles(this.devContainer);

        this.createStatsModal();

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
        this.frameCount++;
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

        // Update Sprig List every 30 frames if modal is open
        if (this.isModalOpen && this.frameCount % 30 === 0) {
            this.updateSprigList();
        }
    }

    private addStatsToggleButton(container: HTMLElement) {
        const btn = document.createElement('div');
        btn.className = 'ui-stats-toggle';
        btn.textContent = 'STATS';
        btn.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            this.toggleModal();
        });
        container.appendChild(btn);
    }

    private createStatsModal() {
        this.modalContainer = document.createElement('div');
        this.modalContainer.className = 'sprig-modal';
        
        const header = document.createElement('div');
        header.className = 'sprig-modal-header';
        header.innerHTML = `<span style="flex-grow: 1; text-align: center; margin-left: 30px; font-weight: bold; font-size: 18px;">Colony Statistics</span>`;
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'sprig-modal-close';
        closeBtn.textContent = 'X';
        closeBtn.onclick = () => this.toggleModal();
        header.appendChild(closeBtn);
        
        this.sprigList = document.createElement('div');
        this.sprigList.className = 'sprig-list';
        
        this.modalContainer.appendChild(header);
        this.modalContainer.appendChild(this.sprigList);
        document.body.appendChild(this.modalContainer);
    }

    private toggleModal() {
        this.isModalOpen = !this.isModalOpen;
        if (this.modalContainer) {
            this.modalContainer.classList.toggle('active', this.isModalOpen);
        }
        if (this.isModalOpen) this.updateSprigList();
    }

    private updateSprigList() {
        if (!this.sprigList) return;
        
        const sprigs = this.world.sprigs;
        const jobs = this.world.jobs;
        let html = '';
        
        for (let i = 0; i < sprigs.active.length; i++) {
            if (sprigs.active[i] === 0) continue;
            
            const typeEmoji = sprigs.type[i] === 1 ? '😈' : '🌱';
            const hLvl = sprigs.level_haul[i];
            const fLvl = sprigs.level_fight[i];
            const hXp = sprigs.xp_haul[i];
            const fXp = sprigs.xp_fight[i];
            const jobId = sprigs.jobId[i];
            const food = sprigs.stock[i].count('FOOD');
            
            let jobText = 'IDLE';
            if (jobId !== -1 && jobs.active[jobId]) {
                const jobType = jobs.type[jobId];
                jobText = this.getJobName(jobType);
            }

            html += `<div class="sprig-entry">` +
                    `<span class="id">${typeEmoji}[${i}]</span> ` +
                    `<span class="haul">Haul:L${hLvl}</span> ` +
                    `<span class="haul-xp">XP:${hXp}</span> ` +
                    `<span class="fight">Fight:L${fLvl}</span> ` +
                    `<span class="fight-xp">XP:${fXp}</span> ` +
                    `<span class="job">${jobText}</span> ` +
                    `<span class="stock">📦${food}</span>` +
                    `</div>`;
        }
        
        this.sprigList.innerHTML = html || '<div style="text-align: center; padding: 20px;">No active sprigs.</div>';
    }

    private getJobName(type: number): string {
        switch(type) {
            case 1: return 'HARVEST';
            case 2: return 'BUILD';
            case 3: return 'HAUL';
            case 4: return 'ATTACK';
            case 5: return 'PATROL';
            default: return 'IDLE';
        }
    }
}
