import { GridCoord } from '../types/GraphTypes';

export class Pathfinder {
    /**
     * Calculates a simple straight-line path between two points in grid coordinates.
     * Uses Bresenham's Line Algorithm.
     * @param startX World X start
     * @param startY World Y start
     * @param endX World X end
     * @param endY World Y end
     * @param cellSize Size of the grid cells
     * @returns Array of grid coordinates {gx, gy}
     */
    public static getPath(startX: number, startY: number, endX: number, endY: number, cellSize: number): GridCoord[] {
        let x0 = Math.floor(startX / cellSize);
        let y0 = Math.floor(startY / cellSize);
        const x1 = Math.floor(endX / cellSize);
        const y1 = Math.floor(endY / cellSize);

        const path: GridCoord[] = [];

        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
        const sx = (x0 < x1) ? 1 : -1;
        const sy = (y0 < y1) ? 1 : -1;
        let err = dx - dy;

        while (true) {
            path.push({ gx: x0, gy: y0 });

            if (x0 === x1 && y0 === y1) break;
            
            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x0 += sx;
            }
            if (e2 < dx) {
                err += dx;
                y0 += sy;
            }
        }
        
        return path;
    }
}
