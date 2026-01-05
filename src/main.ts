import { Application } from 'pixi.js';
import { WorldState } from './core/WorldState';
import { RenderSystem } from './systems/RenderSystem';
import { MovementSystem } from './systems/MovementSystem';
import { HiveMindSystem } from './systems/HiveMindSystem';
import { NavigationSystem } from './systems/NavigationSystem';
import { ToolManager } from './systems/ToolManager';
import { EcologySystem } from './systems/EcologySystem';
import { UISystem } from './systems/UISystem';
import { InputState } from './core/InputState';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from './core/Config';

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
    const renderSystem = new RenderSystem(app, world);
    const movementSystem = new MovementSystem();
    const hiveMindSystem = new HiveMindSystem();
    const navigationSystem = new NavigationSystem();
    const toolManager = new ToolManager(world);
    const ecologySystem = new EcologySystem();
    const uiSystem = new UISystem(app);

    // Toolbar UI
    const toolButtons: Record<string, HTMLDivElement> = {};
    const tools = ['SCENT', 'ROCK', 'ERASER'];

    function createToolbar() {
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.bottom = '20px';
        container.style.left = '50%';
        container.style.transform = 'translateX(-50%)';
        container.style.display = 'flex';
        container.style.gap = '10px';
        container.style.zIndex = '100';
        document.body.appendChild(container);

        tools.forEach(name => {
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
            
            btn.addEventListener('pointerdown', (e) => {
                e.stopPropagation(); // Prevent map interaction
                toolManager.setTool(name);
            });

            container.appendChild(btn);
            toolButtons[name] = btn;
        });
    }

    function updateButtons() {
        const active = toolManager.getActiveToolName();
        tools.forEach(name => {
            const btn = toolButtons[name];
            if (name === active) {
                btn.style.backgroundColor = '#4CAF50'; // Green
                btn.style.borderColor = '#66BB6A';
            } else {
                btn.style.backgroundColor = '#444';
                btn.style.borderColor = '#555';
            }
        });
    }

    createToolbar();

    // Keybinds
    window.addEventListener('keydown', (e) => {
        if (e.key === '1') toolManager.setTool('SCENT');
        if (e.key === '2') toolManager.setTool('ROCK');
        if (e.key === '3') toolManager.setTool('ERASER');
    });

    app.ticker.add(() => {
        const dt = app.ticker.deltaMS / 1000;
        toolManager.update(world);
        ecologySystem.update(world, dt);
        hiveMindSystem.update(world);
        navigationSystem.update(world, dt);
        movementSystem.update(world, dt);
        renderSystem.update();
        uiSystem.update(world);
        updateButtons();
    });
}

init();
