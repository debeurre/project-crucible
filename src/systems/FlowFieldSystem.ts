import { Application, Graphics, Container } from 'pixi.js';
import { CONFIG } from '../config';
import { TaskIntent } from '../types/GraphTypes';

export class FlowFieldSystem {
    public container: Container;
    private arrowGraphics: Graphics;
    private gridGraphics: Graphics;
    private app: Application;
    
    // Layers
    private fieldManual: Float32Array; 
    private fieldGraph: Float32Array; 
    private fieldGraphIntent: Int32Array; 

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
        
        // Initialize Arrays
        const size = this.gridCols * this.gridRows * 2;
        this.fieldManual = new Float32Array(size); 
        this.fieldGraph = new Float32Array(size); 
        this.fieldGraphIntent = new Int32Array(this.gridCols * this.gridRows); 
        
        // Initialize to zero
        this.fieldManual.fill(0);
        this.fieldGraph.fill(0);
        this.fieldGraphIntent.fill(-1); // -1 for no intent (numeric)

        // Handle resize
        this.app.renderer.on('resize', this.resize.bind(this));
        this.resize(); // Initial draw
    }

    public resize() {
        this.gridCols = Math.ceil(this.app.screen.width / this.cellSize);
        this.gridRows = Math.ceil(this.app.screen.height / this.cellSize);
        
        const size = this.gridCols * this.gridRows * 2;
        const cellCount = this.gridCols * this.gridRows;

        if (this.fieldManual.length !== size) {
            this.fieldManual = new Float32Array(size);
            this.fieldGraph = new Float32Array(size);
            this.fieldGraphIntent = new Int32Array(cellCount);
            
            this.fieldManual.fill(0);
            this.fieldGraph.fill(0);
            this.fieldGraphIntent.fill(-1);
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

    public applyFlow(sprigX: number, sprigY: number, currentVelX: number, currentVelY: number, dt: number): {vx: number, vy: number, intent: TaskIntent | null} {
        const col = Math.floor(sprigX / this.cellSize);
        const row = Math.floor(sprigY / this.cellSize);

        if (col < 0 || col >= this.gridCols || row < 0 || row >= this.gridRows) {
            return {vx: currentVelX, vy: currentVelY, intent: null}; 
        }

        const index = (row * this.gridCols + col) * 2;
        const intentIndex = row * this.gridCols + col;
        
        // 1. Check Graph Layer (High Priority)
        let flowX = this.fieldGraph[index];
        let flowY = this.fieldGraph[index + 1];
        let intentId = this.fieldGraphIntent[intentIndex];
        let intent: TaskIntent | null = intentId !== -1 ? (intentId as TaskIntent) : null;

        // 2. Check Manual Layer (Low Priority) - only if graph vector is zero
        if (flowX === 0 && flowY === 0) {
            flowX = this.fieldManual[index];
            flowY = this.fieldManual[index + 1];
            // intent remains null or could be a default 'MANUAL' intent if we wanted
        }

        // Apply flow force scaled by dt
        currentVelX += flowX * CONFIG.FLOW_FIELD_FORCE_SCALE * dt;
        currentVelY += flowY * CONFIG.FLOW_FIELD_FORCE_SCALE * dt;

        // Apply Magnetism (Attract to flow axis)
        const magSq = flowX * flowX + flowY * flowY;
        if (magSq > 0.01) { 
            const mag = Math.sqrt(magSq);
            const nx = flowX / mag;
            const ny = flowY / mag;
            
            const centerX = col * this.cellSize + this.cellSize / 2;
            const centerY = row * this.cellSize + this.cellSize / 2;
            
            const dx = sprigX - centerX;
            const dy = sprigY - centerY;
            
            const dot = dx * nx + dy * ny;
            
            const perpX = dx - dot * nx;
            const perpY = dy - dot * ny;
            
            currentVelX -= perpX * CONFIG.FLOW_FIELD_MAGNETISM * dt;
            currentVelY -= perpY * CONFIG.FLOW_FIELD_MAGNETISM * dt;
        }

        return {vx: currentVelX, vy: currentVelY, intent};
    }

    public paintManualFlow(mouseX: number, mouseY: number, dragVecX: number, dragVecY: number) {
        // Apply flow to cells under the mouse (Manual Layer)
        const radius = 2; 
        for (let r = -radius; r <= radius; r++) {
            for (let c = -radius; c <= radius; c++) {
                const col = Math.floor(mouseX / this.cellSize) + c;
                const row = Math.floor(mouseY / this.cellSize) + r;

                if (col >= 0 && col < this.gridCols && row >= 0 && row < this.gridRows) {
                    const index = (row * this.gridCols + col) * 2;
                    
                    // Add to existing flow
                    this.fieldManual[index] += dragVecX;
                    this.fieldManual[index + 1] += dragVecY;

                    // Clamp
                    const magSq = this.fieldManual[index]**2 + this.fieldManual[index+1]**2;
                    const maxMag = 10.0;
                    if (magSq > maxMag**2) {
                        const mag = Math.sqrt(magSq);
                        this.fieldManual[index] = (this.fieldManual[index] / mag) * maxMag;
                        this.fieldManual[index + 1] = (this.fieldManual[index + 1] / mag) * maxMag;
                    }
                }
            }
        }
        this.updateVisuals(); 
    }
    
    public setGraphFlow(col: number, row: number, vx: number, vy: number, intent: TaskIntent) {
        if (col >= 0 && col < this.gridCols && row >= 0 && row < this.gridRows) {
            const index = (row * this.gridCols + col) * 2;
            const intentIndex = row * this.gridCols + col;
            
            this.fieldGraph[index] = vx;
            this.fieldGraph[index + 1] = vy;
            this.fieldGraphIntent[intentIndex] = intent;
        }
    }

    public paintIntent(mouseX: number, mouseY: number, intent: TaskIntent) {
        // Brush Logic: Paint intent onto Graph Layer without flow vectors
        // Radius can be configurable, hardcoded for now
        // We want a 5x5 grid with rounded corners (skipping (2,2) etc)
        // Max radius = 2 (5x5 box)
        // Threshold: (2,1) distSq=5 -> Keep. (2,2) distSq=8 -> Skip.
        // So radiusSq should be between 5 and 8. Let's use 6.
        const loopRadius = 2; 
        const radiusSq = 6;

        for (let r = -loopRadius; r <= loopRadius; r++) {
            for (let c = -loopRadius; c <= loopRadius; c++) {
                if (r * r + c * c > radiusSq) continue; // Skip corners (distSq 8)

                const col = Math.floor(mouseX / this.cellSize) + c;
                const row = Math.floor(mouseY / this.cellSize) + r;

                if (col >= 0 && col < this.gridCols && row >= 0 && row < this.gridRows) {
                    const intentIndex = row * this.gridCols + col;
                    this.fieldGraphIntent[intentIndex] = intent;
                }
            }
        }
        this.updateVisuals();
    }

    public clearGraphFlowAt(col: number, row: number) {
        if (col >= 0 && col < this.gridCols && row >= 0 && row < this.gridRows) {
            const index = (row * this.gridCols + col) * 2;
            const intentIndex = row * this.gridCols + col;
            
            this.fieldGraph[index] = 0;
            this.fieldGraph[index + 1] = 0;
            this.fieldGraphIntent[intentIndex] = -1;
        }
    }

    // New method for clearing flow (Cut action)
    public clearFlow(mouseX: number, mouseY: number) {
        // Eraser logic: wipe everything in radius
        const radius = 2; // Check if config has eraser radius, otherwise use 2 cells (~40px)
        for (let r = -radius; r <= radius; r++) {
            for (let c = -radius; c <= radius; c++) {
                const col = Math.floor(mouseX / this.cellSize) + c;
                const row = Math.floor(mouseY / this.cellSize) + r;

                if (col >= 0 && col < this.gridCols && row >= 0 && row < this.gridRows) {
                    const index = (row * this.gridCols + col) * 2;
                    const intentIndex = row * this.gridCols + col;
                    
                    // Wipe Manual
                    this.fieldManual[index] = 0;
                    this.fieldManual[index + 1] = 0;
                    
                    // Wipe Graph
                    this.fieldGraph[index] = 0;
                    this.fieldGraph[index + 1] = 0;
                    this.fieldGraphIntent[intentIndex] = -1;
                }
            }
        }
        this.updateVisuals();
    }

    public clearAll() {
        this.fieldManual.fill(0);
        this.fieldGraph.fill(0);
        this.fieldGraphIntent.fill(-1);
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
        const stride = CONFIG.FLOW_FIELD_VISUAL_STRIDE;
        
        // Iterate grid
        for (let row = 0; row < this.gridRows; row += stride) {
            for (let col = 0; col < this.gridCols; col += stride) {
                const index = (row * this.gridCols + col) * 2;
                
                // Visualization Priority: Show Graph if present, else Manual
                let flowX = this.fieldGraph[index];
                let flowY = this.fieldGraph[index + 1];
                let isGraph = (flowX !== 0 || flowY !== 0);
                
                if (!isGraph) {
                    flowX = this.fieldManual[index];
                    flowY = this.fieldManual[index + 1];
                }

                const centerX = col * this.cellSize + (this.cellSize * stride) / 2;
                const centerY = row * this.cellSize + (this.cellSize * stride) / 2;

                // Check for Intent Only (Brush)
                const intentId = this.fieldGraphIntent[row * this.gridCols + col];
                if (intentId !== -1) {
                    // Draw filled square for intent area
                    // Use low alpha to indicate area
                    this.arrowGraphics.rect(col * this.cellSize, row * this.cellSize, this.cellSize, this.cellSize)
                        .fill({ color: CONFIG.INTENT_COLORS[intentId], alpha: CONFIG.INTENT_ALPHA[intentId] });
                }

                // Only draw arrow if there's significant flow
                if (Math.abs(flowX) < 0.1 && Math.abs(flowY) < 0.1) continue;
                
                // Color: Use Intent Color if Graph, else Default Red
                let arrowColor = CONFIG.FLOW_FIELD_VISUAL_COLOR;
                if (isGraph && intentId !== -1) {
                     arrowColor = CONFIG.INTENT_COLORS[intentId];
                }

                const endX = centerX + flowX * arrowLength;
                const endY = centerY + flowY * arrowLength;
                
                // Main arrow shaft (thick)
                this.arrowGraphics.moveTo(centerX, centerY);
                this.arrowGraphics.lineTo(endX, endY);
                this.arrowGraphics.stroke({ width: CONFIG.FLOW_FIELD_VISUAL_THICKNESS, color: arrowColor });
                
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
                
                this.arrowGraphics.moveTo(endX, endY); 
                this.arrowGraphics.lineTo(p1x, p1y);   
                this.arrowGraphics.lineTo(p2x, p2y);   
                this.arrowGraphics.closePath();
                this.arrowGraphics.fill(arrowColor);
            }
        }
    }
}