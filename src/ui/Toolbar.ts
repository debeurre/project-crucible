import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { TaskIntent } from '../types/GraphTypes';
import { MapShape } from '../types/MapTypes';

export type ToolMode = 'PENCIL' | 'ERASER' | 'COMMAND_BRUSH' | 'FOOD_TRACE';

export class Toolbar extends Container {
    private bg: Graphics;
    private pencilBtn: Container;
    private eraserBtn: Container;
    private brushBtn: Container; 
    private foodTraceBtn: Container; 
    
    // Map Selector
    private mapBtn!: Container;
    private mapLabel!: Text;
    private mapMenuContainer!: Container; 
    private isMapMenuOpen: boolean = false; 

    private activeTool: ToolMode = 'COMMAND_BRUSH';
    
    private onToolSelected: (tool: ToolMode) => void;
    private onMapSelected: (mode: MapShape) => void; 
    
    constructor(
        onToolSelected: (tool: ToolMode) => void, 
        _onIntentSelected: (intent: TaskIntent) => void, // Kept for signature compatibility but unused
        onMapSelected: (mode: MapShape) => void 
    ) {
        super();
        this.onToolSelected = onToolSelected;
        this.onMapSelected = onMapSelected;

        this.bg = new Graphics();
        this.addChild(this.bg);

        // Tools (Ordered: COMMAND_BRUSH, PENCIL, ERASER, FOOD_TRACE)
        this.brushBtn = this.createButton('COMMAND_BRUSH');
        this.pencilBtn = this.createButton('PENCIL');
        this.eraserBtn = this.createButton('ERASER');
        this.foodTraceBtn = this.createButton('FOOD_TRACE');

        this.addChild(this.brushBtn);
        this.addChild(this.pencilBtn);
        this.addChild(this.eraserBtn);
        this.addChild(this.foodTraceBtn);
        
        // Map Button
        this.mapBtn = this.createMapButton();
        this.addChild(this.mapBtn);
        
        // Map Menu (Hidden by default)
        this.mapMenuContainer = new Container();
        this.mapMenuContainer.visible = false;
        this.addChild(this.mapMenuContainer);
        this.createMapMenu();

        this.draw();
        
        // Initial state matches ToolManager default
        this.setTool('COMMAND_BRUSH');
    }

    private getMapLabel(mode: MapShape): string {
        switch (mode) {
            case MapShape.FULL: return 'ROOM0';
            case MapShape.ROOM1: return 'ROOM1';
            default: return mode;
        }
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
        this.mapLabel = new Text({ text: 'ROOM0', style });
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
            btn.y = -((i * itemHeight) + (itemHeight / 2) + 5); 
            btn.x = 0; 

            const label = new Text({ text: this.getMapLabel(mode), style: {
                fontFamily: 'monospace',
                fontSize: 12,
                fill: 0xFFFFFF,
                align: 'center'
            }});
            label.anchor.set(0.5, 0.5); 
            btn.addChild(label);
            
            const hit = new Graphics();
            hit.rect(-width/2 + 5, -15, width - 10, 30).fill({ color: 0xFFFFFF, alpha: 0.001 });
            btn.addChild(hit);

            btn.eventMode = 'static';
            btn.cursor = 'pointer';
            
            btn.on('pointerover', () => label.style.fill = 0x00FF00);
            btn.on('pointerout', () => label.style.fill = 0xFFFFFF);
            
            btn.on('pointerdown', (e) => {
                e.stopPropagation();
                this.onMapSelected(mode);
                this.toggleMapMenu(); 
            });

            this.mapMenuContainer.addChild(btn);
        });
    }

    public setMapMode(mode: MapShape) {
        this.mapLabel.text = this.getMapLabel(mode);
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
        else if (mode === 'COMMAND_BRUSH') this.drawBrushIcon(icon);
        else if (mode === 'FOOD_TRACE') {
            this.drawTraceIcon(icon);
            // Green tint is handled by drawing in green directly or tinting?
            // drawTraceIcon will handle color.
        }
        else this.drawEraserIcon(icon);
        
        btn.addChild(icon);
        return btn;
    }

    private drawTraceIcon(g: Graphics) {
        g.clear();
        const color = 0x00FF00; // Green
        
        // Berry Bunch (Triangle of 3 circles)
        // Top
        g.circle(0, -4, 4).fill(color);
        // Bottom Left
        g.circle(-4, 3, 4).fill(color);
        // Bottom Right
        g.circle(4, 3, 4).fill(color);
    }

    private drawPencilIcon(g: Graphics) {
        g.clear();
        g.moveTo(-8, 8);
        g.bezierCurveTo(-5, -5, 5, 5, 8, -8);
        g.stroke({ width: 2, color: 0xFFFFFF });
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

    public setTool(tool: ToolMode) {
        this.activeTool = tool;
        this.draw();
    }
    
    public setActiveIntent(_intent: TaskIntent) {
        // No-op, intent swatches removed
    }

    private draw() {
        // Layout Config
        const btnW = 50;
        const gap = 10;
        const mapBtnW = 80;
        
        // Tools: 4 buttons
        const numTools = 4;
        const toolsWidth = numTools * btnW + (numTools - 1) * gap;

        const mapWidth = mapBtnW;
        const separator = 20;
        const padding = 20;
        
        const totalWidth = toolsWidth + separator + mapWidth + padding * 2;
        const height = 60;
        
        // Background
        this.bg.clear();
        this.bg.roundRect(-totalWidth / 2, -height / 2, totalWidth, height, 30)
               .fill({ color: 0x222222, alpha: 0.9 })
               .stroke({ width: 1, color: 0x555555 });

        // Position Tools
        let startX = -totalWidth / 2 + padding + btnW / 2;
        
        // Order: COMMAND_BRUSH, PENCIL, ERASER, FOOD_TRACE
        this.brushBtn.x = startX;
        this.pencilBtn.x = startX + btnW + gap;
        this.eraserBtn.x = startX + (btnW + gap) * 2;
        this.foodTraceBtn.x = startX + (btnW + gap) * 3;
        
        // Position Map Button
        const mapStartX = startX + (btnW + gap) * (numTools - 1) + btnW / 2 + separator + mapBtnW / 2;
        this.mapBtn.x = mapStartX;
        this.mapBtn.y = 0; 
        
        this.mapMenuContainer.x = mapStartX;
        this.mapMenuContainer.y = -20; 

        // Highlight Active Tool
        let highlightX = 0;
        if (this.activeTool === 'COMMAND_BRUSH') highlightX = this.brushBtn.x;
        else if (this.activeTool === 'PENCIL') highlightX = this.pencilBtn.x;
        else if (this.activeTool === 'ERASER') highlightX = this.eraserBtn.x;
        else if (this.activeTool === 'FOOD_TRACE') highlightX = this.foodTraceBtn.x;

        this.bg.circle(highlightX, 0, 22).fill({ color: 0xFFFFFF, alpha: 0.1 });
        
        // Update Opacity
        this.brushBtn.alpha = this.activeTool === 'COMMAND_BRUSH' ? 1.0 : 0.5;
        this.pencilBtn.alpha = this.activeTool === 'PENCIL' ? 1.0 : 0.5;
        this.eraserBtn.alpha = this.activeTool === 'ERASER' ? 1.0 : 0.5;
        this.foodTraceBtn.alpha = this.activeTool === 'FOOD_TRACE' ? 1.0 : 0.5;
    }

    public resize(screenWidth: number, screenHeight: number) {
        this.x = screenWidth / 2;
        this.y = screenHeight - 60; 
    }
}
