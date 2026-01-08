import { RailNode } from './Pathfinder';

export class Spline {
    // Catmull-Rom Spline
    // Based on standard implementation ensuring curve passes through control points
    public static smoothPath(points: RailNode[], segmentsPerNode: number = 10): RailNode[] {
        if (points.length < 2) return points;

        const smoothPath: RailNode[] = [];
        
        // Add start/end padding for Catmull-Rom (duplicate start/end points)
        // Or handle indices carefully.
        // Let's use the 4-point formulation: P0, P1, P2, P3. Curve is between P1 and P2.
        
        // Pad the points array to handle start/end segments
        const paddedPoints = [points[0], ...points, points[points.length - 1]];

        for (let i = 0; i < paddedPoints.length - 3; i++) {
            const p0 = paddedPoints[i];
            const p1 = paddedPoints[i + 1];
            const p2 = paddedPoints[i + 2];
            const p3 = paddedPoints[i + 3];

            for (let t = 0; t < 1; t += 1 / segmentsPerNode) {
                const pt = this.getCatmullRomPoint(t, p0, p1, p2, p3);
                smoothPath.push(pt);
            }
        }
        
        // Ensure the very last point is added
        smoothPath.push(points[points.length - 1]);

        return smoothPath;
    }

    private static getCatmullRomPoint(t: number, p0: RailNode, p1: RailNode, p2: RailNode, p3: RailNode): RailNode {
        const t2 = t * t;
        const t3 = t2 * t;

        const f1 = -0.5 * t3 + t2 - 0.5 * t;
        const f2 = 1.5 * t3 - 2.5 * t2 + 1.0;
        const f3 = -1.5 * t3 + 2.0 * t2 + 0.5 * t;
        const f4 = 0.5 * t3 - 0.5 * t2;

        const x = p0.x * f1 + p1.x * f2 + p2.x * f3 + p3.x * f4;
        const y = p0.y * f1 + p1.y * f2 + p2.y * f3 + p3.y * f4;

        return { x, y };
    }
}
