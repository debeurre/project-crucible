import { Application, Container, Sprite, Texture, Ticker } from 'pixi.js';
import { ISystem } from './ISystem';
import { CONFIG } from '../config';
import { TextureFactory } from './TextureFactory';

interface Item {
    id: number;
    x: number;
    y: number;
    type: string; // 'BERRY'
    sprite: Sprite;
}

export class ItemSystem implements ISystem {
    public container: Container;
    private items: Item[] = [];
    private nextId: number = 0;
    private berryTexture: Texture;

    constructor(app: Application) {
        this.container = new Container();
        // Generate texture once
        this.berryTexture = TextureFactory.getBerryTexture(app.renderer);
    }

    public spawnItem(x: number, y: number, type: string = 'BERRY') {
        const id = this.nextId++;
        const sprite = new Sprite(this.berryTexture);
        sprite.anchor.set(0.5);
        sprite.tint = CONFIG.ITEMS.BERRY_COLOR;
        
        // Random scatter slightly so they don't stack perfectly
        const scatter = 10;
        const sx = x + (Math.random() - 0.5) * scatter;
        const sy = y + (Math.random() - 0.5) * scatter;
        
        sprite.x = sx;
        sprite.y = sy;
        
        this.container.addChild(sprite);
        
        this.items.push({ id, x: sx, y: sy, type, sprite });
    }

    public removeItem(id: number) {
        const index = this.items.findIndex(item => item.id === id);
        if (index !== -1) {
            const item = this.items[index];
            this.container.removeChild(item.sprite);
            item.sprite.destroy(); 
            this.items.splice(index, 1);
        }
    }
    
    public getNearestItem(x: number, y: number, radius: number): Item | null {
        let bestDistSq = radius * radius;
        let bestItem: Item | null = null;
        
        for (const item of this.items) {
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
