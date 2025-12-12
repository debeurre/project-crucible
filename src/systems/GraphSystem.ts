import { Container, Graphics } from 'pixi.js';
import { GraphNode, GraphEdge, TaskIntent, NodeType } from '../types/GraphTypes';
import { FlowFieldSystem } from './FlowFieldSystem';
import { Pathfinder } from '../utils/Pathfinder';
import { CONFIG } from '../config';

export class GraphSystem {
    public container: Container;
    private nodes: GraphNode[] = [];
    private edges: GraphEdge[] = [];
    private nextNodeId = 1;
    private nextEdgeId = 1;

    private graphics: Graphics;
    private flowFieldSystem: FlowFieldSystem;

    constructor(container: Container, flowFieldSystem: FlowFieldSystem) {
        this.container = container;
        this.flowFieldSystem = flowFieldSystem;
        this.graphics = new Graphics();
        this.container.addChild(this.graphics);
    }

    public addNode(x: number, y: number, type: NodeType = NodeType.WAYPOINT): GraphNode {
        const node: GraphNode = {
            id: this.nextNodeId++,
            x,
            y,
            type
        };
        this.nodes.push(node);
        this.draw();
        return node;
    }

    public createLink(nodeAId: number, nodeBId: number, intent: TaskIntent) {
        const nodeA = this.nodes.find(n => n.id === nodeAId);
        const nodeB = this.nodes.find(n => n.id === nodeBId);
        if (!nodeA || !nodeB) return;

        const edge: GraphEdge = {
            id: this.nextEdgeId++,
            nodeAId,
            nodeBId,
            intent,
            isActive: true
        };
        this.edges.push(edge);

        // Bake the path
        this.bakeEdge(nodeA, nodeB, intent);
        this.draw();
    }

    private bakeEdge(nodeA: GraphNode, nodeB: GraphNode, intent: TaskIntent) {
        const path = Pathfinder.getPath(nodeA.x, nodeA.y, nodeB.x, nodeB.y, CONFIG.FLOW_FIELD_CELL_SIZE);
        
        // Bake vector into each cell
        for (let i = 0; i < path.length; i++) {
            const current = path[i];
            
            // Calculate direction
            let dx = 0;
            let dy = 0;

            if (i < path.length - 1) {
                const next = path[i + 1];
                dx = next.gx - current.gx;
                dy = next.gy - current.gy;
            } else {
                // Last cell: point towards the actual node B world position?
                // Or just keep previous direction?
                // Let's point to node B center relative to cell center
                const cellCenterX = current.gx * CONFIG.FLOW_FIELD_CELL_SIZE + CONFIG.FLOW_FIELD_CELL_SIZE / 2;
                const cellCenterY = current.gy * CONFIG.FLOW_FIELD_CELL_SIZE + CONFIG.FLOW_FIELD_CELL_SIZE / 2;
                dx = nodeB.x - cellCenterX;
                dy = nodeB.y - cellCenterY;
            }

            // Normalize
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len > 0) {
                dx /= len;
                dy /= len;
            }

            this.flowFieldSystem.setGraphFlow(current.gx, current.gy, dx, dy, intent);
        }
        
        // Trigger update visuals on flow field
        this.flowFieldSystem.updateVisuals();
    }

    private draw() {
        this.graphics.clear();
        
        // Draw Edges (Infrastructure lines)
        for (const edge of this.edges) {
            const nodeA = this.nodes.find(n => n.id === edge.nodeAId);
            const nodeB = this.nodes.find(n => n.id === edge.nodeBId);
            if (nodeA && nodeB) {
                this.graphics.moveTo(nodeA.x, nodeA.y);
                this.graphics.lineTo(nodeB.x, nodeB.y);
                this.graphics.stroke({ width: 2, color: edge.intent, alpha: 0.5 });
            }
        }

        // Draw Nodes
        for (const node of this.nodes) {
            let color = 0xFFFFFF;
            let radius = 5;
            if (node.type === NodeType.BUILDING) {
                color = 0x00FFFF;
                radius = 10;
            } else if (node.type === NodeType.RESOURCE) {
                color = 0xFFA500;
                radius = 8;
            } else {
                // Waypoint
                color = 0xAAAAAA;
                radius = 4;
            }

            this.graphics.circle(node.x, node.y, radius);
            this.graphics.fill({ color: color });
            this.graphics.stroke({ width: 1, color: 0x000000 });
        }
    }
    
    public getNodes() {
        return this.nodes;
    }
    
    // Find node clicked
    public getNodeAt(x: number, y: number): GraphNode | null {
        // Simple radius check
        for (const node of this.nodes) {
            const dx = node.x - x;
            const dy = node.y - y;
            if (dx*dx + dy*dy < 15*15) { // 15px hit radius
                return node;
            }
        }
        return null;
    }

    public removeElementsAt(x: number, y: number, radius: number) {
        const rSq = radius * radius;
        
        // 1. Find Nodes to remove
        const nodesToRemove = this.nodes.filter(n => {
            const dx = n.x - x;
            const dy = n.y - y;
            return (dx*dx + dy*dy) < rSq;
        });

        // 2. Remove Nodes
        if (nodesToRemove.length > 0) {
            const idsToRemove = new Set(nodesToRemove.map(n => n.id));
            this.nodes = this.nodes.filter(n => !idsToRemove.has(n.id));
            
            // 3. Remove Edges connected to these nodes
            this.edges = this.edges.filter(e => !idsToRemove.has(e.nodeAId) && !idsToRemove.has(e.nodeBId));
        }

        this.draw();
    }

    public drawPreviewLine(fromX: number, fromY: number, toX: number, toY: number, isValid: boolean) {
        // Redraw everything first (to clear old preview if any, or we could use a separate graphics object)
        // For simplicity, let's just clear and redraw all + preview. 
        // Optimization: Use a separate "previewGraphics" container if this is slow.
        // Given low entity count, full redraw is fine for now.
        this.draw(); 
        
        this.graphics.moveTo(fromX, fromY);
        this.graphics.lineTo(toX, toY);
        
        // Dashed effect? Pixi doesn't do native dashed lines easily without plugins.
        // Just use low alpha or specific color.
        const color = isValid ? 0x00FF00 : 0xFF0000;
        this.graphics.stroke({ width: 2, color: color, alpha: 0.5 });
        
        // Ghost Node at end
        this.graphics.circle(toX, toY, 4).fill({ color: color, alpha: 0.5 });
    }

    public clearPreview() {
        this.draw();
    }
}
