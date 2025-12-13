import { Container, Graphics, Text } from 'pixi.js';

export type ToolMode = 'PENCIL' | 'PEN' | 'ERASER';

export class Toolbar extends Container {
    private bg: Graphics;
    private pencilBtn: Container;
    private penBtn: Container;
    private eraserBtn: Container;
    
    // Icon Graphics References
    private penIcon: Graphics;

    private activeTool: ToolMode = 'PENCIL';
    private isChaining: boolean = false; // New state
    private onToolSelected: (tool: ToolMode) => void;

    private readonly BUTTON_WIDTH = 50;
    private readonly BUTTON_GAP = 10;
    private readonly PADDING = 10;
    
    // Width = 3 buttons * 50 + 2 gaps * 10 + 2 padding * 10 = 150 + 20 + 20 = 190
    private readonly WIDTH = 190;
    private readonly HEIGHT = 60;
    private readonly RADIUS = 30; // Pill shape
    private readonly BG_COLOR = 0x222222;
    private readonly ACTIVE_COLOR = 0x444444;
    private readonly ICON_COLOR = 0xFFFFFF;
    private readonly INACTIVE_ALPHA = 0.5;

    constructor(onToolSelected: (tool: ToolMode) => void) {
        super();
        this.onToolSelected = onToolSelected;

        this.bg = new Graphics();
        this.addChild(this.bg);

        // Calculate positions
        const startX = -this.WIDTH / 2 + this.PADDING + this.BUTTON_WIDTH / 2;
        const gap = this.BUTTON_WIDTH + this.BUTTON_GAP;

        this.pencilBtn = this.createButton('PENCIL', startX);
        this.penBtn = this.createButton('PEN', startX + gap);
        this.eraserBtn = this.createButton('ERASER', startX + gap * 2);

        this.addChild(this.pencilBtn);
        this.addChild(this.penBtn);
        this.addChild(this.eraserBtn);

        this.draw();
        
        // Initial state
        this.setTool('PENCIL');
    }

    private createButton(mode: ToolMode, xOffset: number): Container {
        const btn = new Container();
        btn.x = xOffset;
        
        // Hit Area
        const hit = new Graphics();
        hit.rect(-25, -25, 50, 50).fill({ color: 0x000000, alpha: 0.001 }); // Transparent hit area
        btn.addChild(hit);
        
        // Event
        btn.eventMode = 'static';
        btn.cursor = 'pointer';
        btn.on('pointerdown', (e) => {
            e.stopPropagation(); // Prevent game interaction
            this.onToolSelected(mode);
        });

        // Icon
        const icon = new Graphics();
        if (mode === 'PENCIL') {
            this.drawPencilIcon(icon);
        } else if (mode === 'PEN') {
            this.penIcon = icon; // Store reference
            this.updatePenIcon(); // Draw initial state
        } else {
            this.drawEraserIcon(icon);
        }
        btn.addChild(icon);

        return btn;
    }

    private updatePenIcon() {
        if (this.isChaining) {
            this.drawCheckIcon(this.penIcon);
        } else {
            this.drawPenIcon(this.penIcon);
        }
    }

    private drawPencilIcon(g: Graphics) {
        g.clear();
        // Squiggle
        g.moveTo(-8, 8);
        g.bezierCurveTo(-5, -5, 5, 5, 8, -8);
        g.stroke({ width: 2, color: this.ICON_COLOR });
    }

    private drawPenIcon(g: Graphics) {
        g.clear();
        // Bezier Node style
        g.circle(-6, 6, 3).fill(this.ICON_COLOR);
        g.circle(6, -6, 3).fill(this.ICON_COLOR);
        g.moveTo(-6, 6);
        g.lineTo(6, -6);
        g.stroke({ width: 2, color: this.ICON_COLOR });
    }

    private drawCheckIcon(g: Graphics) {
        g.clear();
        // Checkmark
        g.moveTo(-8, 0);
        g.lineTo(-2, 6);
        g.lineTo(8, -6);
        g.stroke({ width: 3, color: 0x00FF00 }); // Green Check
    }

    private drawEraserIcon(g: Graphics) {
        g.clear();
        // Eraser block
        g.rect(-8, -6, 16, 12).stroke({ width: 2, color: this.ICON_COLOR });
        // Slanted line
        g.moveTo(-4, -6);
        g.lineTo(-4, 6);
        g.stroke({ width: 1, color: this.ICON_COLOR });
    }

    public setTool(tool: ToolMode) {
        this.activeTool = tool;
        this.draw();
    }

    public setPenState(isChaining: boolean) {
        this.isChaining = isChaining;
        this.draw();
    }

    private draw() {
        // Background Pill
        this.bg.clear();
        this.bg.roundRect(-this.WIDTH / 2, -this.HEIGHT / 2, this.WIDTH, this.HEIGHT, this.RADIUS)
               .fill({ color: this.BG_COLOR, alpha: 0.9 })
               .stroke({ width: 1, color: 0x555555 });

        // Highlight Active
        let highlightX = 0;
        const startX = -this.WIDTH / 2 + this.PADDING + this.BUTTON_WIDTH / 2;
        const gap = this.BUTTON_WIDTH + this.BUTTON_GAP;

        if (this.activeTool === 'PENCIL') highlightX = startX;
        else if (this.activeTool === 'PEN') highlightX = startX + gap;
        else if (this.activeTool === 'ERASER') highlightX = startX + gap * 2;

        this.bg.circle(highlightX, 0, 22).fill({ color: 0xFFFFFF, alpha: 0.1 });

        // Update Opacity
        this.pencilBtn.alpha = this.activeTool === 'PENCIL' ? 1.0 : this.INACTIVE_ALPHA;
        this.penBtn.alpha = this.activeTool === 'PEN' ? 1.0 : this.INACTIVE_ALPHA;
        this.eraserBtn.alpha = this.activeTool === 'ERASER' ? 1.0 : this.INACTIVE_ALPHA;
        
        // Ensure Pen Icon is up to date
        if (this.penIcon) {
            this.updatePenIcon();
        }
    }

    public resize(screenWidth: number, screenHeight: number) {
        this.x = screenWidth / 2;
        this.y = screenHeight - 60; // 60px from bottom
    }
}
