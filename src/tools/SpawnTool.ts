import { Tool } from './Tool';
import { WorldState } from '../core/WorldState';
import { CONFIG } from '../core/Config';

export class SpawnTool implements Tool {
    private downTime: number = 0;
    private accumulator: number = 0;
    private lastFrameTime: number = 0;

    public onDown(_world: WorldState, _x: number, _y: number): void {
        this.downTime = Date.now();
        this.accumulator = 0;
        this.lastFrameTime = Date.now();
    }

    public onDrag(world: WorldState, x: number, y: number): void {
        const now = Date.now();
        const duration = now - this.downTime;
        const dt = (now - this.lastFrameTime) / 1000;
        this.lastFrameTime = now;

        if (duration > CONFIG.TOOLS.TAP_THRESHOLD_MS) {
            // Hold Logic
            this.accumulator += dt * CONFIG.TOOLS.SPAWN_PER_SEC;
            while (this.accumulator >= 1) {
                world.sprigs.spawn(x, y);
                this.accumulator -= 1;
            }
        }
    }

    public onUp(world: WorldState, x: number, y: number): void {
        const duration = Date.now() - this.downTime;
        if (duration <= CONFIG.TOOLS.TAP_THRESHOLD_MS) {
            // Tap Logic
            for (let i = 0; i < CONFIG.TOOLS.SPAWN_PER_TAP; i++) {
                world.sprigs.spawn(x, y);
            }
        }
    }

    public cycleOption(): void {}

    public getOptionName(): string {
        return "SPRIG";
    }
}
