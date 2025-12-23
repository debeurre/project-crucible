import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { TaskIntent } from '../types/GraphTypes';
import { CONFIG } from '../config';
import { MapShape } from '../types/MapTypes';

export type ToolMode = 'PENCIL' | 'PEN' | 'ERASER' | 'BRUSH';

export class Toolbar extends Container {
    private bg: Graphics;
    private pencilBtn: Container;
    private penBtn: Container;
    private eraserBtn: Container;
    private brushBtn: Container; 
    
    // Intent Swatches
    private swatchContainer: Container;
    private swatches: Container[] = [];

    // Map Selector
    private mapBtn!: Container;
    private mapLabel!: Text;
    private mapMenuContainer!: Container; // Also this one since it's inited later
    private isMapMenuOpen: boolean = false; // New

    // Icon Graphics References
    private penIcon?: Graphics;

    private activeTool: ToolMode = 'PENCIL';
    private activeIntent: TaskIntent = TaskIntent.GREEN_HARVEST;
    private isChaining: boolean = false; 
    
    private onToolSelected: (tool: ToolMode) => void;
    private onIntentSelected: (intent: TaskIntent) => void;
    private onMapSelected: (mode: MapShape) => void; // Changed from Cycle
    
    constructor(
        onToolSelected: (tool: ToolMode) => void, 
        onIntentSelected: (intent: TaskIntent) => void,
        onMapSelected: (mode: MapShape) => void // Changed
    ) {
        super();
        this.onToolSelected = onToolSelected;
        this.onIntentSelected = onIntentSelected;
        this.onMapSelected = onMapSelected;

        this.bg = new Graphics();
        this.addChild(this.bg);

        // Tools
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

        // Map Button
        this.mapBtn = this.createMapButton();
        this.addChild(this.mapBtn);
        
        // Map Menu (Hidden by default)
        this.mapMenuContainer = new Container();
        this.mapMenuContainer.visible = false;
        this.addChild(this.mapMenuContainer);
        this.createMapMenu();

        this.draw();
        
        // Initial state
        this.setTool('PENCIL');
    }

    private createMapButton(): Container {
        const btn = new Container();
        
        // Background
        const bg = new Graphics();
        bg.roundRect(-40, -15, 80, 30, 15).fill({ color: 0x333333 }).stroke({ width: 1, color: 0xAAAAAA });
        btn.addChild(bg);

        // Label
        const style = new TextStyle({
            fontFamily: 'monospace',
            fontSize: 12,
            fill: 0xFFFFFF,
            fontWeight: 'bold',
            align: 'center'
        });
        this.mapLabel = new Text({ text: 'FULL', style });
        this.mapLabel.anchor.set(0.5);
        this.mapLabel.x = 0; // Center
        btn.addChild(this.mapLabel);

        // Event
        btn.eventMode = 'static';
        btn.cursor = 'pointer';
        btn.on('pointerdown', (e) => {
            e.stopPropagation();
            this.toggleMapMenu();
        });

        return btn;
    }

    private toggleMapMenu() {
        this.isMapMenuOpen = !this.isMapMenuOpen;
        this.mapMenuContainer.visible = this.isMapMenuOpen;
        if (this.isMapMenuOpen) {
            // Re-draw or position menu?
            // Position is set in draw(), but we might need to bring to top
            this.setChildIndex(this.mapMenuContainer, this.children.length - 1);
        }
    }

    private createMapMenu() {
        const modes = Object.values(MapShape);
        const itemHeight = 30;
        const width = 100;
        
        // Background for menu
        const bg = new Graphics();
        bg.roundRect(-width/2, -modes.length * itemHeight - 10, width, modes.length * itemHeight + 10, 10)
          .fill({ color: 0x222222, alpha: 0.95 })
          .stroke({ width: 1, color: 0x555555 });
        this.mapMenuContainer.addChild(bg);

        modes.forEach((mode, i) => {
            const btn = new Container();
            btn.y = -(i + 1) * itemHeight; // Stack upwards
            btn.x = 0; // Centered relative to container

            const label = new Text({ text: mode, style: {
                fontFamily: 'monospace',
                fontSize: 12,
                fill: 0xFFFFFF,
                align: 'center'
            }});
            label.anchor.set(0.5);
            btn.addChild(label);
            
            // Hit area
            const hit = new Graphics();
            hit.rect(-width/2 + 5, -15, width - 10, 30).fill({ color: 0xFFFFFF, alpha: 0.001 });
            btn.addChild(hit);

            btn.eventMode = 'static';
            btn.cursor = 'pointer';
            
            // Hover effect
            btn.on('pointerover', () => label.style.fill = 0x00FF00);
            btn.on('pointerout', () => label.style.fill = 0xFFFFFF);
            
            btn.on('pointerdown', (e) => {
                e.stopPropagation();
                this.onMapSelected(mode);
                this.toggleMapMenu(); // Close on select
            });

            this.mapMenuContainer.addChild(btn);
        });
    }

    public setMapMode(mode: MapShape) {
        this.mapLabel.text = mode;
        // Don't redraw whole toolbar, just label
    }
    
    // ... rest of createButton, createSwatches, icon drawers ...

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
            TaskIntent.YELLOW_ASSIST
        ];

        intents.forEach(intent => {
            const btn = new Container();
            const g = new Graphics();
            g.circle(0, 0, 10).fill({ color: CONFIG.INTENT_COLORS[intent] });
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
        if (!this.penIcon) return;
        
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
        const mapBtnW = 80;
        
        // Tools: 4 buttons
        const numTools = 4;
        const toolsWidth = numTools * btnW + (numTools - 1) * gap;

        // Swatches: Dynamic count
        const numSwatches = this.swatches.length;
        const swatchesWidth = numSwatches * swatchW + (numSwatches > 0 ? (numSwatches - 1) * swatchGap : 0);

        const mapWidth = mapBtnW;
        const separator = 20;
        const padding = 20;
        
        const totalWidth = toolsWidth + separator + swatchesWidth + separator + mapWidth + padding * 2;
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
        const swatchStartX = startX + (btnW + gap) * (numTools - 1) + btnW / 2 + separator + swatchW / 2;
        this.swatches.forEach((swatch, i) => {
            swatch.x = swatchStartX + i * (swatchW + swatchGap);
            swatch.y = 0;
        });

        // Position Map Button
        // Calculate based on the position of the last swatch to ensure no overlap
        const lastSwatchX = swatchStartX + (numSwatches > 0 ? (numSwatches - 1) * (swatchW + swatchGap) : 0);
        const mapStartX = numSwatches > 0 
            ? lastSwatchX + swatchW / 2 + separator + mapBtnW / 2 
            : swatchStartX + mapBtnW / 2; // Fallback if no swatches (unlikely)
            
        this.mapBtn.x = mapStartX;
        this.mapBtn.y = 0; // Center vertically
        
        // Position Menu above Button
        this.mapMenuContainer.x = mapStartX;
        this.mapMenuContainer.y = -20; // Start above button

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
                TaskIntent.YELLOW_ASSIST
            ];
            const isActive = intents[i] === this.activeIntent;
            
            g.clear();
            g.circle(0, 0, 10).fill({ color: CONFIG.INTENT_COLORS[intents[i]] });
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
