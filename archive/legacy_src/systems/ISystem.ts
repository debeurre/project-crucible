import { Container, Ticker } from 'pixi.js';

export interface ISystem {
    /**
     * The visual container for this system (optional).
     */
    container?: Container;

    /**
     * Called every frame.
     * @param ticker PixiJS Ticker
     */
    update?(ticker: Ticker): void;

    /**
     * Called when the screen resizes.
     * @param width New screen width
     * @param height New screen height
     */
    resize?(width: number, height: number): void;
}
