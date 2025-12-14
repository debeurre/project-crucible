import { Ticker, Graphics } from 'pixi.js';

export interface ITool {
    onDown(x: number, y: number): void;
    onHold(x: number, y: number, ticker: Ticker): void;
    onUp(x: number, y: number): void;
    onActivate(): void;
    onDeactivate(): void;
    update(ticker: Ticker): void;
    renderCursor(g: Graphics, x: number, y: number): void;
}
