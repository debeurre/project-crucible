import { Ticker } from 'pixi.js';
import { ISystem } from './ISystem';

export class SystemManager {
    private systems: ISystem[] = [];

    public addSystem(system: ISystem) {
        this.systems.push(system);
    }

    public update(ticker: Ticker) {
        for (const system of this.systems) {
            if (system.update) {
                system.update(ticker);
            }
        }
    }

    public resize(width: number, height: number) {
        for (const system of this.systems) {
            if (system.resize) {
                system.resize(width, height);
            }
        }
    }
}
