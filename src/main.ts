import { Application } from 'pixi.js';
import { WorldState } from './core/WorldState';
import { RenderSystem } from './systems/RenderSystem';
import { MovementSystem } from './systems/MovementSystem';
import { HiveMindSystem } from './systems/HiveMindSystem';
import { NavigationSystem } from './systems/NavigationSystem';
import { ToolManager } from './systems/ToolManager';
import { EcologySystem } from './systems/EcologySystem';
import { UISystem } from './systems/UISystem';
import { TextureManager } from './core/TextureManager';
import { InputState } from './core/InputState';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from './core/Config';
import { FlowFieldSystem } from './systems/FlowFieldSystem';

async function init() {
    const app = new Application();
    
    await app.init({
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        backgroundColor: 0x1a1a1a,
        antialias: true,
    });

    document.body.appendChild(app.canvas);
    
    // Initialize Input
    InputState.init(app.canvas);

    const world = new WorldState();

    // Initialize TextureManager before RenderSystem
    await TextureManager.init(app);

    const renderSystem = new RenderSystem(app, world);
    const movementSystem = new MovementSystem();
    const hiveMindSystem = new HiveMindSystem();
    const navigationSystem = new NavigationSystem();
    const toolManager = new ToolManager(world);
    const ecologySystem = new EcologySystem();
    const uiSystem = new UISystem(app);
    const flowFieldSystem = new FlowFieldSystem();

    // Toolbar UI
    const toolButtons: Record<string, HTMLDivElement> = {};
    const optionButtons: Record<string, HTMLDivElement> = {};
    const tools = ['HAND', 'PAINT', 'BUILD', 'SPAWN', 'ERASER'];

    function createToolbar() {
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.top = '50%';
        container.style.left = '20px';
        container.style.transform = 'translateY(-50%)';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '10px';
        container.style.zIndex = '100';
        document.body.appendChild(container);

        tools.forEach(name => {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.gap = '5px';

            // Main Tool Button
            const btn = document.createElement('div');
            btn.textContent = name;
            btn.style.backgroundColor = '#444';
            btn.style.color = 'white';
            btn.style.padding = '10px 20px';
            btn.style.border = '1px solid #555';
            btn.style.borderRadius = '5px';
            btn.style.cursor = 'pointer';
            btn.style.fontFamily = 'monospace';
            btn.style.userSelect = 'none';
            btn.style.textAlign = 'center';
            btn.style.flexGrow = '1';
            
            btn.addEventListener('pointerdown', (e) => {
                e.stopPropagation(); // Prevent map interaction
                toolManager.setTool(name);
            });

            row.appendChild(btn);
            toolButtons[name] = btn;

            // Option Pip
            const optName = toolManager.getToolOption(name);
            if (optName) {
                const optBtn = document.createElement('div');
                optBtn.textContent = optName;
                optBtn.style.backgroundColor = '#2196F3';
                optBtn.style.color = 'white';
                optBtn.style.padding = '10px 10px';
                optBtn.style.border = '1px solid #1976D2';
                optBtn.style.borderRadius = '5px';
                optBtn.style.cursor = 'pointer';
                optBtn.style.fontFamily = 'monospace';
                optBtn.style.userSelect = 'none';
                optBtn.style.textAlign = 'center';
                optBtn.style.minWidth = '60px';
                optBtn.style.fontSize = '12px';
                optBtn.style.display = 'flex';
                optBtn.style.alignItems = 'center';
                optBtn.style.justifyContent = 'center';

                optBtn.addEventListener('pointerdown', (e) => {
                    e.stopPropagation();
                    toolManager.cycleToolOption(name);
                    optBtn.textContent = toolManager.getToolOption(name);
                    // Also select tool when cycling option
                    toolManager.setTool(name);
                });

                row.appendChild(optBtn);
                optionButtons[name] = optBtn;
            }

            container.appendChild(row);
        });
    }
    
    let lastActiveTool = '';

    function updateButtons() {
        const active = toolManager.getActiveToolName();
        if (active === lastActiveTool) return;
        lastActiveTool = active;

        tools.forEach(name => {
            const btn = toolButtons[name];
            if (name === active) {
                btn.style.backgroundColor = '#4CAF50';
                btn.style.borderColor = '#66BB6A';
            } else {
                btn.style.backgroundColor = '#444';
                btn.style.borderColor = '#555';
            }
        });
    }

    createToolbar();

    window.addEventListener('keydown', (e) => {
        if (e.key === '1') toolManager.setTool('HAND');
        if (e.key === '2') toolManager.setTool('PAINT');
        if (e.key === '3') toolManager.setTool('BUILD');
        if (e.key === '4') toolManager.setTool('SPAWN');
        if (e.key === '5') toolManager.setTool('ERASER');
    });

    app.ticker.add(() => {
        const dt = app.ticker.deltaMS / 1000;
        toolManager.update(world);
        ecologySystem.update(world, dt);
        hiveMindSystem.update(world);
        flowFieldSystem.update();
        navigationSystem.update(world, dt);
        movementSystem.update(world, dt);
        
        renderSystem.activeTool = toolManager.getActiveToolName();
        renderSystem.update();
        
        uiSystem.update(world);
        updateButtons();
    });
}

init();