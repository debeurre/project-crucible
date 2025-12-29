import { Application, Ticker } from 'pixi.js';
import { ISystem } from './ISystem';
import { SprigSystem } from '../SprigSystem';

export class InvaderSystem implements ISystem {
    private app: Application;
    private sprigSystem: SprigSystem;
    private spawnTimer: number = 0;
    private isActive: boolean = false;
    private spawnInterval: number = 15; // Seconds

    constructor(app: Application, sprigSystem: SprigSystem) {
        this.app = app;
        this.sprigSystem = sprigSystem;
    }

    public setActive(active: boolean) {
        this.isActive = active;
        this.spawnTimer = 0; 
    }

    public loadLevelData(structures: any[]) {
        const hasSpawner = structures.some(s => s.type === 'INVADER_SPAWNER');
        this.setActive(hasSpawner);
    }

    public update(ticker: Ticker) {
        if (!this.isActive) return;

        this.spawnTimer += ticker.deltaMS / 1000;
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0;
            this.spawnInvader();
        }
    }

    private spawnInvader() {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.max(this.app.screen.width, this.app.screen.height) * 0.6;
        const gx = this.app.screen.width / 2 + Math.cos(angle) * dist;
        const gy = this.app.screen.height / 2 + Math.sin(angle) * dist;
        this.sprigSystem.spawnSprig(gx, gy, 1); // Team 1 = Invader
    }
}