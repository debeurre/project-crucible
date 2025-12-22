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

    constructor(flowFieldSystem: FlowFieldSystem) {
        this.container = new Container();
        this.flowFieldSystem = flowFieldSystem;
        this.graphics = new Graphics();
        console.log('GraphSystem: this.container =', this.container); // DEBUG
        this.container.addChild(this.graphics);
    }

    public addNode(x: number, y: number, type: NodeType = NodeType.WAYPOINT): GraphNode {
        const node: GraphNode = {
            id: this.nextNodeId++,
            x,
            y,
            type,
            active: true // New nodes start active (part of current chain)
        };
        this.nodes.push(node);
        this.draw();
        return node;
    }

    public setActiveNode(id: number) {
        const node = this.nodes.find(n => n.id === id);
        if (node) {
            node.active = true;
            this.draw();
        }
    }

    public commitActiveNodes() {
        for (const node of this.nodes) {
            if (node.active) node.active = false;
        }
        this.draw();
    }

    public performAbort() {
        const nodesToRemove = this.nodes.filter(n => n.active);
        if (nodesToRemove.length === 0) return;

        const idsToRemove = new Set(nodesToRemove.map(n => n.id));
        const edgesToRemove = this.edges.filter(e => idsToRemove.has(e.nodeAId) || idsToRemove.has(e.nodeBId));

        // Clear Flow for these edges
        // We need to look up node data. If a node is being removed, we have it in nodesToRemove.
        // If a node is persistent (e.g. the anchor of the chain), we find it in this.nodes.
        const allNodesMap = new Map<number, GraphNode>();
        this.nodes.forEach(n => allNodesMap.set(n.id, n)); // Includes active ones still

        for (const edge of edgesToRemove) {
            const nodeA = allNodesMap.get(edge.nodeAId);
            const nodeB = allNodesMap.get(edge.nodeBId);
            
            if (nodeA && nodeB) {
                const path = Pathfinder.getPath(nodeA.x, nodeA.y, nodeB.x, nodeB.y, CONFIG.FLOW_FIELD_CELL_SIZE);
                for (const point of path) {
                    this.flowFieldSystem.clearGraphFlowAt(point.gx, point.gy);
                }
            }
        }
        this.flowFieldSystem.updateVisuals();

        // Now Delete Data
        this.nodes = this.nodes.filter(n => !idsToRemove.has(n.id));
        this.edges = this.edges.filter(e => !edgesToRemove.includes(e));
    }

    public createLink(nodeAId: number, nodeBId: number, intent: TaskIntent) {
        const nodeA = this.nodes.find(n => n.id === nodeAId);
        const nodeB = this.nodes.find(n => n.id === nodeBId);
        if (!nodeA || !nodeB) return;

        const path = Pathfinder.getPath(nodeA.x, nodeA.y, nodeB.x, nodeB.y, CONFIG.FLOW_FIELD_CELL_SIZE);

        const edge: GraphEdge = {
            id: this.nextEdgeId++,
            nodeAId,
            nodeBId,
            intent,
            isActive: true,
            points: path
        };
        this.edges.push(edge);

        // Bake the path
        this.bakeEdge(path, nodeB.x, nodeB.y, intent);
        this.draw();
    }

    private bakeEdge(path: {gx: number, gy: number}[], targetX: number, targetY: number, intent: TaskIntent) {
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
                dx = targetX - cellCenterX;
                dy = targetY - cellCenterY;
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
                this.graphics.stroke({ width: 2, color: CONFIG.INTENT_COLORS[edge.intent], alpha: 0.5 });
            }
        }

        // Draw Nodes
        for (const node of this.nodes) {
            let color = 0xFFFFFF;
            let radius = 5;
            
            if (node.active) {
                // Glow for active nodes - match Intent Color
                // We assume active node is always the current intent of the pen.
                // For now, let's use the default RED_ATTACK for highlighting.
                // Later, can pass active intent from ToolManager.
                this.graphics.circle(node.x, node.y, radius + 4).fill({ color: CONFIG.INTENT_COLORS[TaskIntent.RED_ATTACK], alpha: CONFIG.INTENT_ALPHA[TaskIntent.RED_ATTACK] });
            }

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

    public getSnapTarget(x: number, y: number, radius: number): GraphNode | null {
        const rSq = radius * radius;
        let bestDistSq = rSq;
        let bestNode: GraphNode | null = null;

        for (const node of this.nodes) {
            if (node.type === NodeType.WAYPOINT) continue; // Only snap to buildings/resources

            const dx = node.x - x;
            const dy = node.y - y;
            const dSq = dx*dx + dy*dy;
            
            if (dSq < bestDistSq) {
                bestDistSq = dSq;
                bestNode = node;
            }
        }
        return bestNode;
    }

    public getNearestEdge(x: number, y: number, radius: number): GraphEdge | null {
        // Find edge closest to point. 
        // Ideally check distance to segments.
        // For prototype, check distance to points in edge.points (which are dense).
        const rSq = radius * radius;
        let bestDistSq = rSq;
        let bestEdge: GraphEdge | null = null;

        for (const edge of this.edges) {
            if (!edge.points || edge.points.length === 0) continue;
            
            // Check a few sample points or all?
            // Optimization: Spatial Hash for edges?
            // For now, simple loop.
            for (const p of edge.points) {
                const px = p.gx * CONFIG.FLOW_FIELD_CELL_SIZE + CONFIG.FLOW_FIELD_CELL_SIZE/2;
                const py = p.gy * CONFIG.FLOW_FIELD_CELL_SIZE + CONFIG.FLOW_FIELD_CELL_SIZE/2;
                const dx = px - x;
                const dy = py - y;
                const dSq = dx*dx + dy*dy;
                
                if (dSq < bestDistSq) {
                    bestDistSq = dSq;
                    bestEdge = edge;
                    // Optimization: Break inner loop if close enough? No, want closest.
                }
            }
        }
        return bestEdge;
    }

    public getEdge(id: number): GraphEdge | undefined {
        return this.edges.find(e => e.id === id);
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

    public clearAll() {
        this.nodes = [];
        this.edges = [];
        this.draw();
    }

    private drawDashedLine(g: Graphics, x1: number, y1: number, x2: number, y2: number, dashLen: number, gapLen: number, color: number, width: number, alpha: number) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        
        if (len === 0) return;
        
        const dashCount = Math.floor(len / (dashLen + gapLen));
        const unitVx = dx / len;
        const unitVy = dy / len;

        for (let i = 0; i < dashCount; i++) {
            const startX = x1 + i * (dashLen + gapLen) * unitVx;
            const startY = y1 + i * (dashLen + gapLen) * unitVy;
            const endX = startX + dashLen * unitVx;
            const endY = startY + dashLen * unitVy;
            
            g.moveTo(startX, startY);
            g.lineTo(endX, endY);
        }
        g.stroke({ width: width, color: color, alpha: alpha });
    }

    public drawPreviewLine(fromX: number, fromY: number, toX: number, toY: number, isValid: boolean) {
        this.graphics.clear(); // Clear everything
        this.draw(); // Redraw static graph elements

                    const pathColor = CONFIG.INTENT_COLORS[TaskIntent.RED_ATTACK]; // The color of the path segments (for now)
                const lineColor = isValid ? pathColor : 0xFF0000; // Path color if valid, pure red if invalid
        // Draw dashed line
        const dashLength = 8;
        const gapLength = 6;
        const lineWidth = 2; // Preview line thickness

        this.drawDashedLine(this.graphics, fromX, fromY, toX, toY, dashLength, gapLength, lineColor, lineWidth, 0.7);
        
        // Ghost Node at end
        this.graphics.circle(toX, toY, 4).fill({ color: lineColor, alpha: 0.5 });
    }

    public clearPreview() {
        this.draw();
    }
}
