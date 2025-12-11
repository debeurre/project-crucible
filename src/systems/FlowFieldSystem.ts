import { Application, Graphics, Container } from 'pixi.js';
import { CONFIG } from '../config';

export class FlowFieldSystem {
    public container: Container;
    private arrowGraphics: Graphics;
    private gridGraphics: Graphics;
    private app: Application;
    
    // Flow field data: [vectorX, vectorY, vectorX, vectorY, ...]
    private field: Float32Array; 
    private gridCols: number;
    private gridRows: number;
    private cellSize: number;
    public showGrid: boolean = false;

    constructor(app: Application) {
        this.app = app;
        this.container = new Container();
        this.arrowGraphics = new Graphics();
        this.gridGraphics = new Graphics();
        
        this.container.addChild(this.gridGraphics);
        this.container.addChild(this.arrowGraphics);
        
        this.gridGraphics.visible = this.showGrid;

        this.cellSize = CONFIG.FLOW_FIELD_CELL_SIZE;
        
        // Calculate grid dimensions based on screen size
        this.gridCols = Math.ceil(app.screen.width / this.cellSize);
        this.gridRows = Math.ceil(app.screen.height / this.cellSize);
        
        // Each cell stores a 2D vector (x, y components)
        this.field = new Float32Array(this.gridCols * this.gridRows * 2); 
        
        // Initialize flow to zero
        for(let i = 0; i < this.field.length; i++) {
            this.field[i] = 0;
        }

        // Handle resize
        this.app.renderer.on('resize', this.resize.bind(this));
        this.resize(); // Initial draw
    }

    public resize() {
        this.gridCols = Math.ceil(this.app.screen.width / this.cellSize);
        this.gridRows = Math.ceil(this.app.screen.height / this.cellSize);
        
        // Re-initialize field if size changes
        const newFieldSize = this.gridCols * this.gridRows * 2;
        if (this.field.length !== newFieldSize) {
            this.field = new Float32Array(newFieldSize);
            // Optionally clear to zero here, or preserve/interpolate if needed
            for(let i = 0; i < this.field.length; i++) {
                this.field[i] = 0;
            }
        }
        
        this.drawGrid();
        this.updateVisuals();
    }
    
    private drawGrid() {
        this.gridGraphics.clear();
        const width = this.gridCols * this.cellSize;
        const height = this.gridRows * this.cellSize;
        
        // Vertical lines
        for (let col = 0; col <= this.gridCols; col++) {
            this.gridGraphics.moveTo(col * this.cellSize, 0);
            this.gridGraphics.lineTo(col * this.cellSize, height);
        }
        // Horizontal lines
        for (let row = 0; row <= this.gridRows; row++) {
            this.gridGraphics.moveTo(0, row * this.cellSize);
            this.gridGraphics.lineTo(width, row * this.cellSize);
        }
        
        this.gridGraphics.stroke({ width: 1, color: CONFIG.FLOW_FIELD_GRID_COLOR, alpha: CONFIG.FLOW_FIELD_GRID_ALPHA });
    }

    public applyFlow(sprigX: number, sprigY: number, currentVelX: number, currentVelY: number, dt: number): {vx: number, vy: number} {
        const col = Math.floor(sprigX / this.cellSize);
        const row = Math.floor(sprigY / this.cellSize);

        if (col < 0 || col >= this.gridCols || row < 0 || row >= this.gridRows) {
            return {vx: currentVelX, vy: currentVelY}; // No flow outside bounds
        }

        const index = (row * this.gridCols + col) * 2;
        const flowX = this.field[index];
        const flowY = this.field[index + 1];

        // Apply flow force scaled by dt
        currentVelX += flowX * CONFIG.FLOW_FIELD_FORCE_SCALE * dt;
        currentVelY += flowY * CONFIG.FLOW_FIELD_FORCE_SCALE * dt;

        // Apply Magnetism (Attract to flow axis)
        // If there is significant flow, push particle towards the "center line" of the flow in this cell
        const magSq = flowX * flowX + flowY * flowY;
        if (magSq > 0.01) { // Only apply if flow is strong enough
            const mag = Math.sqrt(magSq);
            // Normalized flow direction
            const nx = flowX / mag;
            const ny = flowY / mag;
            
            // Cell center
            const centerX = col * this.cellSize + this.cellSize / 2;
            const centerY = row * this.cellSize + this.cellSize / 2;
            
            // Vector from center to sprig
            const dx = sprigX - centerX;
            const dy = sprigY - centerY;
            
            // Project offset onto flow direction (dot product)
            const dot = dx * nx + dy * ny;
            
            // Calculate perpendicular component (distance from axis)
            // perp = offset - (offset . dir) * dir
            const perpX = dx - dot * nx;
            const perpY = dy - dot * ny;
            
            // Apply restoring force opposing the perpendicular offset
            // Force = -perp * Strength * dt
            currentVelX -= perpX * CONFIG.FLOW_FIELD_MAGNETISM * dt;
            currentVelY -= perpY * CONFIG.FLOW_FIELD_MAGNETISM * dt;
        }

        return {vx: currentVelX, vy: currentVelY};
    }

    public paintFlow(mouseX: number, mouseY: number, dragVecX: number, dragVecY: number) {
        // Apply flow to cells under the mouse
        const radius = 2; // Affect a 2x2 area around cursor
        for (let r = -radius; r <= radius; r++) {
            for (let c = -radius; c <= radius; c++) {
                const col = Math.floor(mouseX / this.cellSize) + c;
                const row = Math.floor(mouseY / this.cellSize) + r;

                if (col >= 0 && col < this.gridCols && row >= 0 && row < this.gridRows) {
                    const index = (row * this.gridCols + col) * 2;
                    
                    // Add to existing flow (simple blend)
                    this.field[index] += dragVecX;
                    this.field[index + 1] += dragVecY;

                    // Clamp magnitude to prevent runaway forces
                    const magSq = this.field[index]**2 + this.field[index+1]**2;
                    const maxMag = 10.0; // Max flow vector magnitude
                    if (magSq > maxMag**2) {
                        const mag = Math.sqrt(magSq);
                        this.field[index] = (this.field[index] / mag) * maxMag;
                        this.field[index + 1] = (this.field[index + 1] / mag) * maxMag;
                    }
                }
            }
        }
        this.updateVisuals(); // Update visuals immediately
    }

    // New method for clearing flow (Cut action)
    public clearFlow(mouseX: number, mouseY: number) {
        const radius = 2; // Affect a 2x2 area around cursor
        for (let r = -radius; r <= radius; r++) {
            for (let c = -radius; c <= radius; c++) {
                const col = Math.floor(mouseX / this.cellSize) + c;
                const row = Math.floor(mouseY / this.cellSize) + r;

                if (col >= 0 && col < this.gridCols && row >= 0 && row < this.gridRows) {
                    const index = (row * this.gridCols + col) * 2;
                    this.field[index] = 0;
                    this.field[index + 1] = 0;
                }
            }
        }
        this.updateVisuals();
    }

    public clearAll() {
        for(let i = 0; i < this.field.length; i++) {
            this.field[i] = 0;
        }
        this.updateVisuals();
    }

    public toggleGrid() {
        this.showGrid = !this.showGrid;
        this.gridGraphics.visible = this.showGrid;
    }

    public updateVisuals() {
        this.arrowGraphics.clear();
        this.arrowGraphics.alpha = CONFIG.FLOW_FIELD_VISUAL_ALPHA;
        
        const arrowLength = CONFIG.FLOW_FIELD_VISUAL_ARROW_LENGTH;
        const arrowColor = CONFIG.FLOW_FIELD_VISUAL_COLOR;
        const stride = CONFIG.FLOW_FIELD_VISUAL_STRIDE;
        
        // Always draw thick arrows with filled heads (user requirement)
        for (let row = 0; row < this.gridRows; row += stride) {
            for (let col = 0; col < this.gridCols; col += stride) {
                const index = (row * this.gridCols + col) * 2;
                const flowX = this.field[index];
                const flowY = this.field[index + 1];

                // Only draw if there's significant flow
                if (Math.abs(flowX) < 0.1 && Math.abs(flowY) < 0.1) continue;

                const centerX = col * this.cellSize + (this.cellSize * stride) / 2;
                const centerY = row * this.cellSize + (this.cellSize * stride) / 2;

                const endX = centerX + flowX * arrowLength;
                const endY = centerY + flowY * arrowLength;
                
                // Main arrow shaft (thick)
                this.arrowGraphics.moveTo(centerX, centerY);
                this.arrowGraphics.lineTo(endX, endY);
                
                // Arrowhead - filled triangle
                const angle = Math.atan2(flowY, flowX);
                const arrowHeadWidth = CONFIG.FLOW_FIELD_VISUAL_THICKNESS * 2.5; 
                const arrowHeadLength = arrowHeadWidth * 1.0; 

                const baseMidX = endX - arrowHeadLength * Math.cos(angle);
                const baseMidY = endY - arrowHeadLength * Math.sin(angle);

                const halfWidthX = (arrowHeadWidth / 2) * Math.sin(angle);
                const halfWidthY = (arrowHeadWidth / 2) * -Math.cos(angle);

                const p1x = baseMidX + halfWidthX;
                const p1y = baseMidY + halfWidthY;

                const p2x = baseMidX - halfWidthX;
                const p2y = baseMidY - halfWidthY;
                
                this.arrowGraphics.beginFill(arrowColor);
                this.arrowGraphics.moveTo(endX, endY); 
                this.arrowGraphics.lineTo(p1x, p1y);   
                this.arrowGraphics.lineTo(p2x, p2y);   
                this.arrowGraphics.closePath();
                this.arrowGraphics.endFill();
            }
        }
        // Stroke all thick arrow shafts at once
        this.arrowGraphics.stroke({ width: CONFIG.FLOW_FIELD_VISUAL_THICKNESS, color: arrowColor });
    }}
