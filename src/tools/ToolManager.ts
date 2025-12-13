import { Container, Graphics, Text } from 'pixi.js';
import { TaskIntent } from '../types/GraphTypes';

export type ToolMode = 'PENCIL' | 'PEN' | 'ERASER' | 'BRUSH';

export class Toolbar extends Container {
    private bg: Graphics;
    private pencilBtn: Container;
    private penBtn: Container;
    private eraserBtn: Container;
    private brushBtn: Container; // New
    
    // Intent Swatches
    private swatchContainer: Container;
    private swatches: Container[] = [];

    // Icon Graphics References
    private penIcon: Graphics;

    private activeTool: ToolMode = 'PENCIL';
    private activeIntent: TaskIntent = TaskIntent.GREEN_HARVEST; // Default
    private isChaining: boolean = false; 
    private onToolSelected: (tool: ToolMode) => void;
    private onIntentSelected: (intent: TaskIntent) => void; // New callback

    private readonly BUTTON_WIDTH = 50;
    private readonly BUTTON_GAP = 10;
    private readonly PADDING = 10;
    
    // Width calculation: 4 buttons
    // 4 * 50 + 3 * 10 + 2 * 10 = 200 + 30 + 20 = 250
    // Plus Swatches... 
    // Let's put swatches in a second row or to the side?
    // Figma style: Side or above?
    // Let's put them above the toolbar for now, or expand width.
    // Let's expand width. 
    // 5 swatches * 30px + gaps?
    // Let's keep it simple: 2 rows? Or just one long bar.
    // Long bar: [Pencil] [Pen] [Brush] [Eraser] | [Green] [Red] [Blue] [Yellow] [White]
    
    constructor(onToolSelected: (tool: ToolMode) => void, onIntentSelected: (intent: TaskIntent) => void) {
        super();
        this.onToolSelected = onToolSelected;
        this.onIntentSelected = onIntentSelected;

        this.bg = new Graphics();
        this.addChild(this.bg);

        // Tools
        let currentX = 0;
        const startX = -(4 * 50 + 3 * 10) / 2; // Rough center adjust, will fix in resize/draw
        
        // Actually, let's just create them and position in draw/resize?
        // No, create once.
        
        this.pencilBtn = this.createButton('PENCIL');
        this.penBtn = this.createButton('PEN');
        this.brushBtn = this.createButton('BRUSH');
        this.eraserBtn = this.createButton('ERASER');

        this.addChild(this.pencilBtn);
        this.addChild(this.penBtn);
        this.addChild(this.brushBtn);
        this.addChild(this.eraserBtn);
        
        // Swatches
        this.swatchContainer = new Container();
        this.addChild(this.swatchContainer);
        this.createSwatches();

        this.draw();
        
        // Initial state
        this.setTool('PENCIL');
    }

    private createButton(mode: ToolMode): Container {
        const btn = new Container();
        
        // Hit Area
        const hit = new Graphics();
        hit.rect(-25, -25, 50, 50).fill({ color: 0x000000, alpha: 0.001 }); 
        btn.addChild(hit);
        
        // Event
        btn.eventMode = 'static';
        btn.cursor = 'pointer';
        btn.on('pointerdown', (e) => {
            e.stopPropagation();
            this.onToolSelected(mode);
        });

        // Icon
        const icon = new Graphics();
        if (mode === 'PENCIL') this.drawPencilIcon(icon);
        else if (mode === 'PEN') {
            this.penIcon = icon;
            this.updatePenIcon();
        }
        else if (mode === 'BRUSH') this.drawBrushIcon(icon);
        else this.drawEraserIcon(icon);
        
        btn.addChild(icon);
        return btn;
    }

    private createSwatches() {
        const intents = [
            TaskIntent.GREEN_HARVEST,
            TaskIntent.RED_ATTACK,
            TaskIntent.BLUE_SCOUT,
            TaskIntent.YELLOW_ASSIST,
            TaskIntent.WHITE_OVERRIDE
        ];

        intents.forEach(intent => {
            const btn = new Container();
            const g = new Graphics();
            g.circle(0, 0, 10).fill({ color: intent });
            g.stroke({ width: 2, color: 0xFFFFFF, alpha: 0.5 }); // Border
            btn.addChild(g);
            
            btn.eventMode = 'static';
            btn.cursor = 'pointer';
            btn.on('pointerdown', (e) => {
                e.stopPropagation();
                this.onIntentSelected(intent);
            });
            
            // Store intent for reference if needed?
            // Just attach to swatches array
            this.swatches.push(btn);
            this.swatchContainer.addChild(btn);
        });
    }

    // ... Icon Drawers ...
    private drawPencilIcon(g: Graphics) {
        g.clear();
        g.moveTo(-8, 8);
        g.bezierCurveTo(-5, -5, 5, 5, 8, -8);
        g.stroke({ width: 2, color: 0xFFFFFF });
    }
    
    private drawPenIcon(g: Graphics) {
        g.clear();
        g.circle(-6, 6, 3).fill(0xFFFFFF);
        g.circle(6, -6, 3).fill(0xFFFFFF);
        g.moveTo(-6, 6);
        g.lineTo(6, -6);
        g.stroke({ width: 2, color: 0xFFFFFF });
    }

    private drawCheckIcon(g: Graphics) {
        g.clear();
        g.moveTo(-8, 0);
        g.lineTo(-2, 6);
        g.lineTo(8, -6);
        g.stroke({ width: 3, color: 0x00FF00 }); 
    }

    private drawEraserIcon(g: Graphics) {
        g.clear();
        g.rect(-8, -6, 16, 12).stroke({ width: 2, color: 0xFFFFFF });
        g.moveTo(-4, -6);
        g.lineTo(-4, 6);
        g.stroke({ width: 1, color: 0xFFFFFF });
    }

    private drawBrushIcon(g: Graphics) {
        g.clear();
        // Simple brush: circle
        g.circle(0, 0, 8).fill(0xFFFFFF);
        // Handle?
        g.moveTo(4, 4);
        g.lineTo(8, 8);
        g.stroke({ width: 2, color: 0xFFFFFF });
    }

    private updatePenIcon() {
        if (this.isChaining) {
            this.drawCheckIcon(this.penIcon);
        } else {
            this.drawPenIcon(this.penIcon);
        }
    }

    public setTool(tool: ToolMode) {
        this.activeTool = tool;
        this.draw();
    }

    public setPenState(isChaining: boolean) {
        this.isChaining = isChaining;
        this.draw();
    }
    
    public setActiveIntent(intent: TaskIntent) {
        this.activeIntent = intent;
        this.draw();
    }

    private draw() {
        // Layout Config
        const btnW = 50;
        const gap = 10;
        const swatchW = 30;
        const swatchGap = 10;
        
        // Tools: 4 buttons
        // Swatches: 5 buttons
        // Let's center tools, and put swatches to the right? Or above?
        // Let's put swatches on the right with a separator.
        
        const toolsWidth = 4 * btnW + 3 * gap;
        const swatchesWidth = 5 * swatchW + 4 * swatchGap;
        const separator = 20;
        const padding = 20;
        
        const totalWidth = toolsWidth + separator + swatchesWidth + padding * 2;
        const height = 60;
        
        // Background
        this.bg.clear();
        this.bg.roundRect(-totalWidth / 2, -height / 2, totalWidth, height, 30)
               .fill({ color: 0x222222, alpha: 0.9 })
               .stroke({ width: 1, color: 0x555555 });

        // Position Tools
        let startX = -totalWidth / 2 + padding + btnW / 2;
        
        this.pencilBtn.x = startX;
        this.penBtn.x = startX + btnW + gap;
        this.brushBtn.x = startX + (btnW + gap) * 2;
        this.eraserBtn.x = startX + (btnW + gap) * 3;
        
        // Position Swatches
        const swatchStartX = startX + (btnW + gap) * 3 + btnW / 2 + separator + swatchW / 2;
        this.swatches.forEach((swatch, i) => {
            swatch.x = swatchStartX + i * (swatchW + swatchGap);
            swatch.y = 0;
        });

        // Highlight Active Tool
        let highlightX = 0;
        if (this.activeTool === 'PENCIL') highlightX = this.pencilBtn.x;
        else if (this.activeTool === 'PEN') highlightX = this.penBtn.x;
        else if (this.activeTool === 'BRUSH') highlightX = this.brushBtn.x;
        else if (this.activeTool === 'ERASER') highlightX = this.eraserBtn.x;

        this.bg.circle(highlightX, 0, 22).fill({ color: 0xFFFFFF, alpha: 0.1 });
        
        // Highlight Active Intent (Border)
        this.swatches.forEach((swatch, i) => {
            const g = swatch.getChildAt(0) as Graphics;
            // Hacky way to find intent: we know the order
            const intents = [
                TaskIntent.GREEN_HARVEST,
                TaskIntent.RED_ATTACK,
                TaskIntent.BLUE_SCOUT,
                TaskIntent.YELLOW_ASSIST,
                TaskIntent.WHITE_OVERRIDE
            ];
            const isActive = intents[i] === this.activeIntent;
            
            g.clear();
            g.circle(0, 0, 10).fill({ color: intents[i] });
            if (isActive) {
                g.stroke({ width: 3, color: 0xFFFFFF }); // Active thick border
            } else {
                g.stroke({ width: 1, color: 0xAAAAAA }); // Inactive thin border
            }
        });

        // Update Opacity
        this.pencilBtn.alpha = this.activeTool === 'PENCIL' ? 1.0 : 0.5;
        this.penBtn.alpha = this.activeTool === 'PEN' ? 1.0 : 0.5;
        this.brushBtn.alpha = this.activeTool === 'BRUSH' ? 1.0 : 0.5;
        this.eraserBtn.alpha = this.activeTool === 'ERASER' ? 1.0 : 0.5;
        
        if (this.penIcon) this.updatePenIcon();
    }

    public resize(screenWidth: number, screenHeight: number) {
        this.x = screenWidth / 2;
        this.y = screenHeight - 60; 
    }
}
import { ToolMode } from '../ui/Toolbar';
import { PenTool } from './PenTool';
import { PencilTool } from './PencilTool';
import { EraserTool } from './EraserTool';
import { GraphSystem } from '../systems/GraphSystem';
import { FlowFieldSystem } from '../systems/FlowFieldSystem';
import { SprigSystem } from '../SprigSystem';
import { Toolbar } from '../ui/Toolbar';
import { Ticker } from 'pixi.js';
import { TaskIntent } from '../types/GraphTypes';

export class ToolManager {
    private tools: Record<ToolMode, ITool>;
    private activeToolMode: ToolMode = 'PENCIL';
    private activeTool: ITool;
    private toolbar: Toolbar;
    private activeIntent: TaskIntent = TaskIntent.GREEN_HARVEST; // Default

    constructor(
        graphSystem: GraphSystem, 
        flowFieldSystem: FlowFieldSystem, 
        sprigSystem: SprigSystem,
        toolbar: Toolbar
    ) {
        this.toolbar = toolbar;
        
        // Pass toolManager (this) to tools if they need to access intent
        // Currently PenTool needs it.
        // Let's modify PenTool constructor or inject it.
        // Better: Pass `this` to PenTool.
        
        this.tools = {
            'PENCIL': new PencilTool(flowFieldSystem),
            'PEN': new PenTool(graphSystem, toolbar, this),
            'ERASER': new EraserTool(flowFieldSystem, graphSystem, sprigSystem),
            'BRUSH': new PencilTool(flowFieldSystem) // Placeholder for BRUSH, implementing later
        };
        
        this.activeTool = this.tools['PENCIL'];
    }

    public setActiveIntent(intent: TaskIntent) {
        this.activeIntent = intent;
        this.toolbar.setActiveIntent(intent); // Sync UI
    }

    public getActiveIntent(): TaskIntent {
        return this.activeIntent;
    }

    public setTool(mode: ToolMode) {
        if (this.activeToolMode === mode) return;

        this.activeTool.onDeactivate();
        this.activeToolMode = mode;
        this.activeTool = this.tools[mode];
        this.activeTool.onActivate();
        
        this.toolbar.setTool(mode);
    }

    public getActiveToolMode(): ToolMode {
        return this.activeToolMode;
    }

    public getPenTool(): PenTool {
        return this.tools['PEN'] as PenTool;
    }

    // Input Delegation
    public onDown(x: number, y: number) {
        this.activeTool.onDown(x, y);
    }

    public onHold(x: number, y: number, ticker: Ticker) {
        this.activeTool.onHold(x, y, ticker);
    }

    public onUp(x: number, y: number) {
        this.activeTool.onUp(x, y);
    }

    public update(ticker: Ticker) {
        this.activeTool.update(ticker);
    }
}
