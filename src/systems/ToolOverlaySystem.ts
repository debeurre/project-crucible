import { Container, Graphics, Ticker } from 'pixi.js';
import { ISystem } from './ISystem';

export class ToolOverlaySystem implements ISystem {
    public container: Container;
    public graphics: Graphics;

    constructor() {
        this.container = new Container();
        this.graphics = new Graphics();
        this.container.addChild(this.graphics);
    }

    public update(_ticker: Ticker) {
        // Clear previous frame's drawings
        this.graphics.clear();
    }
    
    // Tools will call this directly or access .graphics to draw
    // No resize needed unless we mask it?
}
