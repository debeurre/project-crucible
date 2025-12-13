import { Ticker } from 'pixi.js';

export interface ITool {
    onDown(x: number, y: number): void;
    onHold(x: number, y: number, ticker: Ticker): void;
    onUp(x: number, y: number): void;
    onActivate(): void;
    onDeactivate(): void;
    update(ticker: Ticker): void;
}
