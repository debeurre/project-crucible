import { Application, Container, Sprite, Texture, Ticker } from 'pixi.js';
import { ISystem } from './ISystem';
import { CONFIG } from '../config';
import { TextureFactory } from './TextureFactory';

export interface Crumb {
    id: number;
    x: number;
    y: number;
    sprite: Sprite;
    claimedBy: number;
}

export class ItemSystem implements ISystem {
    public container: Container;
    private items: Crumb[] = [];
    private nextId: number = 0;
    private crumbTexture: Texture;

    constructor(app: Application) {
        this.container = new Container();
        this.crumbTexture = TextureFactory.getCrumbTexture(app.renderer);
    }

    public spawnRandomCrumbs(count: number, centerX: number, centerY: number, radius: number) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = Math.sqrt(Math.random()) * radius; // Uniform distribution
            const x = centerX + Math.cos(angle) * r;
            const y = centerY + Math.sin(angle) * r;
            this.spawnCrumb(x, y);
        }
    }

    public spawnCrumb(x: number, y: number) {
        const id = this.nextId++;
        const sprite = new Sprite(this.crumbTexture);
        sprite.anchor.set(0.5);
        sprite.tint = CONFIG.ITEMS.CRUMB_COLOR;
        
        const scatter = 10;
        const sx = x + (Math.random() - 0.5) * scatter;
        const sy = y + (Math.random() - 0.5) * scatter;
        
        sprite.x = sx;
        sprite.y = sy;
        
        this.container.addChild(sprite);
        
        this.items.push({ id, x: sx, y: sy, sprite, claimedBy: -1 });
    }

    public claimCrumb(id: number, sprigId: number): boolean {
        const item = this.items.find(i => i.id === id);
        if (item && item.claimedBy === -1) {
            item.claimedBy = sprigId;
            return true;
        }
        return false;
    }

    public releaseCrumb(id: number) {
        const item = this.items.find(i => i.id === id);
        if (item) {
            item.claimedBy = -1;
        }
    }

    public removeCrumb(id: number): boolean {
        const index = this.items.findIndex(item => item.id === id);
        if (index !== -1) {
            const item = this.items[index];
            this.container.removeChild(item.sprite);
            item.sprite.destroy(); 
            this.items.splice(index, 1);
            return true;
        }
        return false;
    }
    
    public getNearestCrumb(x: number, y: number, radius: number, ignoreClaimed: boolean = false): Crumb | null {
        let bestDistSq = radius * radius;
        let bestItem: Crumb | null = null;
        
        for (const item of this.items) {
            if (ignoreClaimed && item.claimedBy !== -1) continue;

            const dx = item.x - x;
            const dy = item.y - y;
            const dSq = dx * dx + dy * dy;
            
            if (dSq < bestDistSq) {
                bestDistSq = dSq;
                bestItem = item;
            }
        }
        
        return bestItem;
    }

    public getCrumb(id: number): Crumb | undefined {
        return this.items.find(item => item.id === id);
    }

    public update(_ticker: Ticker) {
        // Items are static for now
    }

    public clearAll() {
        for (const item of this.items) {
            item.sprite.destroy();
        }
        this.container.removeChildren();
        this.items = [];
        this.nextId = 0;
    }
}