import { RailNode } from './Pathfinder';

export class Spline {
    // Catmull-Rom Spline with RDP simplification
    public static smoothPath(points: RailNode[], segmentsPerNode: number = 10): RailNode[] {
        if (points.length < 2) return points;

        // Decimate first to remove staircase artifacts
        const simplified = this.decimatePath(points, 2.0);

        const smoothPath: RailNode[] = [];
        
        // Pad the points array to handle start/end segments
        const paddedPoints = [simplified[0], ...simplified, simplified[simplified.length - 1]];

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
        smoothPath.push(simplified[simplified.length - 1]);

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

    private static decimatePath(points: RailNode[], epsilon: number): RailNode[] {
        if (points.length < 3) return points;

        let dmax = 0;
        let index = 0;
        const end = points.length - 1;

        for (let i = 1; i < end; i++) {
            const d = this.perpendicularDistance(points[i], points[0], points[end]);
            if (d > dmax) {
                index = i;
                dmax = d;
            }
        }

        if (dmax > epsilon) {
            const res1 = this.decimatePath(points.slice(0, index + 1), epsilon);
            const res2 = this.decimatePath(points.slice(index), epsilon);
            return res1.slice(0, res1.length - 1).concat(res2);
        } else {
            return [points[0], points[end]];
        }
    }

    private static perpendicularDistance(p: RailNode, p1: RailNode, p2: RailNode): number {
        let dx = p2.x - p1.x;
        let dy = p2.y - p1.y;
        if (dx === 0 && dy === 0) {
            return Math.sqrt(Math.pow(p.x - p1.x, 2) + Math.pow(p.y - p1.y, 2));
        }

        const numerator = Math.abs(dy * p.x - dx * p.y + p2.x * p1.y - p2.y * p1.x);
        const denominator = Math.sqrt(dy * dy + dx * dx);
        return numerator / denominator;
    }
}