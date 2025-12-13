import { Point, Ticker } from 'pixi.js';
import { ITool } from './ITool';
import { GraphSystem } from '../systems/GraphSystem';
import { Toolbar } from '../ui/Toolbar';
import { TaskIntent } from '../types/GraphTypes';

type PenState = 'IDLE' | 'DRAGGING' | 'CHAINING';

export class PenTool implements ITool {
    private graphSystem: GraphSystem;
    private toolbar: Toolbar;
    
    private state: PenState = 'IDLE';
    private lastNodeId: number | null = null;
    private dragStartPos: Point = new Point();

    constructor(graphSystem: GraphSystem, toolbar: Toolbar) {
        this.graphSystem = graphSystem;
        this.toolbar = toolbar;
    }

    onActivate(): void {
        this.state = 'IDLE';
        this.lastNodeId = null;
        this.toolbar.setPenState(false);
    }

    onDeactivate(): void {
        this.commit();
        this.graphSystem.clearPreview();
        this.toolbar.setPenState(false);
    }

    onDown(x: number, y: number): void {
        const clickedNode = this.graphSystem.getNodeAt(x, y);

        if (this.state === 'IDLE' || this.state === 'CHAINING') {
            if (clickedNode) {
                // Clicked existing node -> Link & Start Drag
                if (this.state === 'CHAINING' && this.lastNodeId !== null && this.lastNodeId !== clickedNode.id) {
                    this.graphSystem.createLink(this.lastNodeId, clickedNode.id, TaskIntent.RED_ATTACK);
                }
                
                this.lastNodeId = clickedNode.id;
                this.graphSystem.setActiveNode(clickedNode.id);
                this.state = 'DRAGGING'; 
                this.dragStartPos.set(clickedNode.x, clickedNode.y);
                this.toolbar.setPenState(true);
            } else {
                // Clicked Empty
                if (this.state === 'IDLE') {
                    // IDLE -> Click Empty -> Create Start Node A
                    const newNode = this.graphSystem.addNode(x, y);
                    this.lastNodeId = newNode.id;
                    this.graphSystem.setActiveNode(newNode.id);
                    this.state = 'DRAGGING';
                    this.dragStartPos.set(newNode.x, newNode.y);
                    this.toolbar.setPenState(true);
                } else if (this.state === 'CHAINING' && this.lastNodeId !== null) {
                    // CHAINING -> Click Empty -> Start "Rubber Band" from Last Node
                    const lastNode = this.graphSystem.getNodes().find(n => n.id === this.lastNodeId);
                    if (lastNode) {
                        this.state = 'DRAGGING';
                        this.dragStartPos.set(lastNode.x, lastNode.y);
                    } else {
                        this.state = 'IDLE';
                    }
                }
            }
        }
    }

    onHold(x: number, y: number, ticker: Ticker): void {
        if (this.state === 'DRAGGING') {
            // Visualize Drag
            let targetX = x;
            let targetY = y;
            const hoverNode = this.graphSystem.getNodeAt(x, y);
            if (hoverNode) {
                targetX = hoverNode.x;
                targetY = hoverNode.y;
            }
            
            if (this.dragStartPos.x !== 0 || this.dragStartPos.y !== 0) {
                 this.graphSystem.drawPreviewLine(this.dragStartPos.x, this.dragStartPos.y, targetX, targetY, true);
            }
        }
    }

    onUp(x: number, y: number): void {
        if (this.state === 'DRAGGING') {
            const hoverNode = this.graphSystem.getNodeAt(x, y);
            
            if (hoverNode && hoverNode.id !== this.lastNodeId) {
                // Linked to existing
                if (this.lastNodeId !== null) {
                    this.graphSystem.createLink(this.lastNodeId, hoverNode.id, TaskIntent.RED_ATTACK);
                }
                this.lastNodeId = hoverNode.id;
                this.graphSystem.setActiveNode(hoverNode.id);
                this.state = 'CHAINING';
                this.toolbar.setPenState(true);
            } else if (!hoverNode) {
                // Dragged to empty -> Create new node
                const distSq = (x - this.dragStartPos.x)**2 + (y - this.dragStartPos.y)**2;
                if (distSq > 100) { 
                    const newNode = this.graphSystem.addNode(x, y);
                    if (this.lastNodeId !== null) {
                        this.graphSystem.createLink(this.lastNodeId, newNode.id, TaskIntent.RED_ATTACK);
                    }
                    this.lastNodeId = newNode.id;
                    this.graphSystem.setActiveNode(newNode.id);
                    this.state = 'CHAINING';
                    this.toolbar.setPenState(true);
                } else {
                    // Tap logic (stay in chaining, or enter chaining if just started)
                    this.state = 'CHAINING';
                    this.toolbar.setPenState(true);
                }
            } else {
                // Released on same node
                this.state = 'CHAINING';
                this.toolbar.setPenState(true);
            }
            
            this.graphSystem.clearPreview();
        }
    }

    update(ticker: Ticker): void {
        // Optional visual updates
    }

    // Explicit Actions
    public commit() {
        this.graphSystem.commitActiveNodes();
        this.state = 'IDLE';
        this.lastNodeId = null;
        this.graphSystem.clearPreview();
        this.toolbar.setPenState(false);
    }

    public abort() {
        this.graphSystem.abortActiveNodes();
        this.state = 'IDLE';
        this.lastNodeId = null;
        this.graphSystem.clearPreview();
        this.toolbar.setPenState(false);
    }
}
