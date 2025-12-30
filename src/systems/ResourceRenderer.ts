import { Container, Sprite, Graphics, Ticker, Application } from 'pixi.js';
import { ResourceSystem } from './ResourceSystem';
import { StructureType, StructureData } from '../types/StructureTypes';
import { TextureFactory } from './TextureFactory';
import { CONFIG } from '../config';

export class ResourceRenderer {
    public container: Container;
    private app: Application;
    private resourceSystem: ResourceSystem;
    private renderMap: Map<number, { container: Container, sprite: Sprite, ui: Graphics }> = new Map();
    
    private tapAnimProgress = 1.0;
    private holdAnimPhase = 0;

    constructor(app: Application, resourceSystem: ResourceSystem) {
        this.app = app;
        this.resourceSystem = resourceSystem;
        this.container = new Container();
    }

    public setAnimationState(tapProgress: number, holdPhase: number) {
        this.tapAnimProgress = tapProgress;
        this.holdAnimPhase = holdPhase;
    }

    public update(_ticker: Ticker) {
        const structures = this.resourceSystem.getStructures();
        
        // 1. Reconcile
        const activeIds = new Set(structures.map(s => s.id));
        for (const [id, renderObj] of this.renderMap) {
            if (!activeIds.has(id)) {
                this.container.removeChild(renderObj.container);
                renderObj.container.destroy({ children: true });
                this.renderMap.delete(id);
            }
        }

        // Add/Update
        for (const s of structures) {
            let renderObj = this.renderMap.get(s.id);
            if (!renderObj) {
                renderObj = this.createRenderObject(s);
                this.renderMap.set(s.id, renderObj);
                this.container.addChild(renderObj.container);
            }
            this.updateRenderObject(renderObj, s);
        }
    }

    private createRenderObject(s: StructureData): { container: Container, sprite: Sprite, ui: Graphics } {
        const container = new Container();
        container.x = s.x;
        container.y = s.y;

        let texture;
        const baseTint = this.getBaseTint(s.type);

        switch (s.type) {
            case StructureType.NEST:
                texture = TextureFactory.getNestTexture(this.app.renderer);
                break;
            case StructureType.COOKIE:
                texture = TextureFactory.getCookieTexture(this.app.renderer);
                break;
            case StructureType.CASTLE:
                texture = TextureFactory.getCastleTexture(this.app.renderer);
                break;
            case StructureType.LEGACY_CRUCIBLE:
                texture = TextureFactory.getCrucibleTexture(this.app.renderer);
                break;
            case StructureType.BUSH:
                texture = TextureFactory.getBushTexture(this.app.renderer);
                break;
            case StructureType.RESOURCE_NODE:
            default:
                texture = TextureFactory.getTrapezoidTexture(this.app.renderer);
                break;
        }

        const sprite = new Sprite(texture);
        sprite.anchor.set(0.5);
        sprite.tint = baseTint;
        
        if (s.type === StructureType.RESOURCE_NODE || s.type === StructureType.BUSH || s.type === StructureType.COOKIE) {
             sprite.rotation = CONFIG.RESOURCE_NODE_ROTATION;
        }

        const ui = new Graphics();

        container.addChild(sprite);
        container.addChild(ui);

        return { container, sprite, ui };
    }

    private getBaseTint(type: StructureType): number {
        switch (type) {
            case StructureType.NEST: return 0xFFD700;
            case StructureType.COOKIE: return 0xD2B48C;
            case StructureType.CASTLE: return CONFIG.CASTLE_COLOR;
            case StructureType.LEGACY_CRUCIBLE: return CONFIG.CRUCIBLE_COLOR;
            case StructureType.BUSH: return 0x006400;
            default: return CONFIG.RESOURCE_NODE_COLOR;
        }
    }

    private updateRenderObject(obj: { container: Container, sprite: Sprite, ui: Graphics }, s: StructureData) {
        obj.container.x = s.x;
        obj.container.y = s.y;

        const baseTint = this.getBaseTint(s.type);
        if (s.flashTimer > 0) {
            obj.sprite.tint = 0xFFFFFF;
        } else {
            obj.sprite.tint = baseTint;
        }

        obj.ui.clear();
        
        if (s.type === StructureType.CASTLE || s.type === StructureType.NEST || s.type === StructureType.LEGACY_CRUCIBLE) {
            // Animation
            let scaleX = 1.0;
            if (this.tapAnimProgress < 1.0) {
                 const t = Math.sin(this.tapAnimProgress * Math.PI); 
                 scaleX = 1.0 - (t * CONFIG.CASTLE_ANIMATION.TAP_SQUEEZE_FACTOR); 
            } else if (this.holdAnimPhase > 0) { // Simple check if active
                 const t = (Math.sin(this.holdAnimPhase) + 1) / 2;
                 scaleX = 1.0 - (t * CONFIG.CASTLE_ANIMATION.HOLD_SQUEEZE_FACTOR);
            }
            const scaleY = 1.0 / Math.max(0.1, scaleX);
            obj.sprite.scale.set(scaleX, scaleY);

            const pct = s.energy / s.maxEnergy;
            const width = 40;
            const height = 6;
            obj.ui.rect(-width/2, -40, width, height).fill(0x000000);
            const color = pct > 0.5 ? 0x00FF00 : (pct > 0.2 ? 0xFFFF00 : 0xFF0000);
            obj.ui.rect(-width/2 + 1, -39, (width - 2) * pct, height - 2).fill(color);
        }
        
        if (s.type === StructureType.COOKIE && s.hp < s.maxHp) {
             const pct = s.hp / s.maxHp;
             const width = 30;
             const height = 4;
             obj.ui.rect(-width/2, -30, width, height).fill(0x000000);
             obj.ui.rect(-width/2 + 1, -29, (width - 2) * pct, height - 2).fill(0x00FF00);
        }
    }
}
