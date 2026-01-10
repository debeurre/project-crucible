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
import { Terrain } from './data/MapData';
import { STRUCTURE_STATS, StructureType } from './data/StructureData';

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
    const toolOptionIcons: Record<string, { val: number, el: HTMLDivElement }[]> = {};
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
            btn.style.width = '80px'; // Fixed Width
            
            btn.addEventListener('pointerdown', (e) => {
                e.stopPropagation();
                toolManager.setTool(name);
            });

            row.appendChild(btn);
            toolButtons[name] = btn;

            // Options
            if (name === 'PAINT') {
                const optionsDiv = document.createElement('div');
                optionsDiv.style.display = 'flex';
                optionsDiv.style.gap = '2px';
                toolOptionIcons[name] = [];
                
                const paints = [
                    { val: Terrain.GRASS, color: '#1a472a' },
                    { val: Terrain.MUD,   color: '#5d4037' },
                    { val: Terrain.WATER, color: '#2196f3' },
                    { val: Terrain.VOID,  color: '#000000' }
                ];

                paints.forEach(p => {
                    const icon = document.createElement('div');
                    icon.style.width = '20px';
                    icon.style.height = '20px';
                    icon.style.backgroundColor = p.color;
                    icon.style.border = '1px solid #fff';
                    icon.style.cursor = 'pointer';
                    icon.addEventListener('pointerdown', (e) => {
                        e.stopPropagation();
                        toolManager.setTool(name);
                        toolManager.setToolOption(name, p.val);
                    });
                    optionsDiv.appendChild(icon);
                    toolOptionIcons[name].push({ val: p.val, el: icon });
                });
                row.appendChild(optionsDiv);
            } else if (name === 'BUILD') {
                const optionsDiv = document.createElement('div');
                optionsDiv.style.display = 'flex';
                optionsDiv.style.gap = '2px';
                toolOptionIcons[name] = [];

                // Order: Nest, Crumb, Cookie, Rock
                const builds = [StructureType.NEST, StructureType.CRUMB, StructureType.COOKIE, StructureType.ROCK];

                builds.forEach(type => {
                    const stats = STRUCTURE_STATS[type];
                    const icon = document.createElement('div');
                    icon.style.width = '20px';
                    icon.style.height = '20px';
                    icon.style.backgroundColor = '#' + stats.color.toString(16).padStart(6, '0');
                    icon.style.borderRadius = '50%'; // Circle
                    icon.style.border = '1px solid #fff';
                    icon.style.cursor = 'pointer';
                    icon.title = stats.name; // Tooltip
                    icon.addEventListener('pointerdown', (e) => {
                        e.stopPropagation();
                        toolManager.setTool(name);
                        toolManager.setToolOption(name, type);
                    });
                    optionsDiv.appendChild(icon);
                    toolOptionIcons[name].push({ val: type, el: icon });
                });
                row.appendChild(optionsDiv);
            }

            container.appendChild(row);
        });

        // Copy Level Button
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
        copyBtn.style.marginTop = '10px'; // Spacing

        copyBtn.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            const data = world.serialize();
            console.log(data);
            navigator.clipboard.writeText(data).then(() => {
                alert("Level JSON copied!");
            }).catch(err => {
                console.error("Failed to copy", err);
            });
        });

        container.appendChild(copyBtn);
    }
    
    let lastActiveTool = '';

    function updateButtons() {
        const active = toolManager.getActiveToolName();
        
        // Update Main Buttons
        if (active !== lastActiveTool) {
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

        // Update Option Icons (Highlight selected)
        const currentOptionName = toolManager.getToolOption(active); 
        
        if (toolOptionIcons[active]) {
            toolOptionIcons[active].forEach(item => {
                let match = false;
                if (active === 'PAINT') {
                    // TerrainTool names: VOID, GRASS, MUD, WATER
                    let name = 'UNKNOWN';
                    switch(item.val) {
                        case Terrain.VOID: name = 'VOID'; break;
                        case Terrain.GRASS: name = 'GRASS'; break;
                        case Terrain.MUD: name = 'MUD'; break;
                        case Terrain.WATER: name = 'WATER'; break;
                    }
                    if (name === currentOptionName) match = true;
                } else if (active === 'BUILD') {
                    const stats = STRUCTURE_STATS[item.val as StructureType];
                    if (stats.name === currentOptionName) match = true;
                }

                if (match) {
                    item.el.style.borderColor = '#FFFF00'; // Yellow Highlight
                    item.el.style.transform = 'scale(1.2)';
                    item.el.style.zIndex = '10';
                } else {
                    item.el.style.borderColor = '#fff';
                    item.el.style.transform = 'scale(1.0)';
                    item.el.style.zIndex = '0';
                }
            });
        }
    }

    createToolbar();

    window.addEventListener('keydown', (e) => {
        if (e.key === '1') toolManager.setTool('HAND');
        if (e.key === '2') toolManager.setTool('PAINT');
        if (e.key === '3') toolManager.setTool('BUILD');
        if (e.key === '4') toolManager.setTool('SPAWN');
        if (e.key === '5') toolManager.setTool('ERASER');

        if (e.key === 'p' || e.key === 'P') {
            const data = world.serialize();
            console.log(data); // Backup in console
            navigator.clipboard.writeText(data).then(() => {
                alert("Level JSON copied to clipboard!");
            }).catch(err => {
                console.error("Failed to copy", err);
            });
        }
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