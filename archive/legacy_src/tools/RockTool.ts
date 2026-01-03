import { ITool } from './ITool';
import { ResourceSystem } from '../systems/ResourceSystem';
import { Graphics, Ticker } from 'pixi.js';

export class RockTool implements ITool {
    private resourceSystem: ResourceSystem;

    constructor(resourceSystem: ResourceSystem) {
        this.resourceSystem = resourceSystem;
    }

    public onActivate() {}
    public onDeactivate() {}

    public onDown(x: number, y: number) {
        // Check for overlap with existing structures
        // Using a radius check for safety
        const radius = 40; 
        if (this.resourceSystem.isNearSource(x, y, radius)) {
            // Can't place too close to existing resources
            return;
        }
        
        // Also check if overlapping with existing rocks (obstacles) specifically?
        // isNearSource checks BUSH, COOKIE, RESOURCE_NODE.
        // We should also check ROCK.
        // resourceSystem.removeStructureAt checks ALL structures for removal.
        // Maybe we need a generic overlap check.
        // For now, let's just spawn. The user said "Verify (x,y) is not inside an existing structure".
        // ResourceSystem doesn't have a public "isOccupied" but has "isNearSource".
        // Let's rely on createRock just working, or add a check if critical.
        // The instruction says "Check Overlap".
        
        // Let's iterate structures manually or assume isNearSource covers enough or add a check.
        // Actually, isNearSource only checks BUSH/COOKIE/RESOURCE_NODE.
        // I should probably add `isObstructed(x, y, radius)` to ResourceSystem or just iterate here if I can't change it.
        // But I can't easily iterate `resourceSystem` structures from here without a getter.
        // `resourceSystem.getStructures()` exists.
        
        const structures = this.resourceSystem.getStructures();
        for (const s of structures) {
            const dx = s.x - x;
            const dy = s.y - y;
            const r = s.radius + 30; // Buffer
            if (dx*dx + dy*dy < r*r) {
                return; // Overlapping
            }
        }

        const size = 30 + Math.random() * 20; // 30-50
        this.resourceSystem.createRock(x, y, size);
    }

    public onHold(_x: number, _y: number, _ticker: Ticker) {}
    public onUp(_x: number, _y: number) {}
    public update(_ticker: Ticker) {}

    public renderCursor(g: Graphics, x: number, y: number) {
        g.circle(x, y, 40).stroke({ width: 2, color: 0x808080, alpha: 0.5 });
    }
}