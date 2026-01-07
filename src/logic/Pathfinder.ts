import { Grid } from '../core/Grid';
import { CONFIG } from '../core/Config';

export interface RailNode {
    x: number;
    y: number;
}

interface AStarNode {
    x: number;
    y: number;
    g: number;
    h: number;
    f: number;
    parent: AStarNode | null;
}

export class Pathfinder {
    public static findPath(startX: number, startY: number, endX: number, endY: number, grid: Grid): RailNode[] {
        const startGx = Math.floor(startX / CONFIG.GRID_SIZE);
        const startGy = Math.floor(startY / CONFIG.GRID_SIZE);
        const endGx = Math.floor(endX / CONFIG.GRID_SIZE);
        const endGy = Math.floor(endY / CONFIG.GRID_SIZE);

        if (grid.isBlocked(endGx, endGy)) {
            // If target is blocked (e.g. inside center of Nest), find closest clear neighbor
            // For now, return empty or try to path to edge?
            // Let's assume valid endpoints for simplicity or fail gracefully.
            // Actually, we can just allow pathing TO a blocked tile (the structure itself) but not THROUGH it?
            // The Grid.ts marks structures as blocked.
            // We should ideally clear the center of structures for pathfinding endpoints or check neighbors.
            // For this phase, let's just return empty if blocked.
            // console.warn("Target is blocked");
            return [];
        }

        const openList: AStarNode[] = [];
        const closedSet = new Set<string>();

        const startNode: AStarNode = { x: startGx, y: startGy, g: 0, h: 0, f: 0, parent: null };
        startNode.h = Math.abs(endGx - startGx) + Math.abs(endGy - startGy);
        startNode.f = startNode.g + startNode.h;
        openList.push(startNode);

        while (openList.length > 0) {
            // Sort by F
            openList.sort((a, b) => a.f - b.f);
            const current = openList.shift()!;
            const key = `${current.x},${current.y}`;

            if (current.x === endGx && current.y === endGy) {
                // Reconstruct path
                const path: RailNode[] = [];
                let curr: AStarNode | null = current;
                while (curr) {
                    path.push({
                        x: curr.x * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2,
                        y: curr.y * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2
                    });
                    curr = curr.parent;
                }
                return path.reverse();
            }

            closedSet.add(key);

            // Neighbors (4-way)
            const neighbors = [
                { x: current.x, y: current.y - 1 },
                { x: current.x, y: current.y + 1 },
                { x: current.x - 1, y: current.y },
                { x: current.x + 1, y: current.y }
            ];

            for (const n of neighbors) {
                if (grid.isBlocked(n.x, n.y)) {
                    // Exception: If it is the END node, allow it? 
                    // No, Grid.update marks everything blocked.
                    // We might need a different grid or logic for structures. 
                    // For now, simple A* around obstacles.
                    continue; 
                }

                const nKey = `${n.x},${n.y}`;
                if (closedSet.has(nKey)) continue;

                const gScore = current.g + 1;
                let existing = openList.find(node => node.x === n.x && node.y === n.y);

                if (!existing) {
                    const h = Math.abs(endGx - n.x) + Math.abs(endGy - n.y);
                    const newNode: AStarNode = {
                        x: n.x,
                        y: n.y,
                        g: gScore,
                        h: h,
                        f: gScore + h,
                        parent: current
                    };
                    openList.push(newNode);
                } else if (gScore < existing.g) {
                    existing.g = gScore;
                    existing.f = existing.g + existing.h;
                    existing.parent = current;
                }
            }
        }

        return []; // No path found
    }
}
