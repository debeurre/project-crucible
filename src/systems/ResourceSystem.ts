import { Ticker } from 'pixi.js';
import { ISystem } from './ISystem';
import { StructureType, StructureData } from '../types/StructureTypes';
import { CONFIG } from '../config';

export class ResourceSystem implements ISystem {
    private structures: StructureData[] = [];
    private appWidth: number = 0;
    private appHeight: number = 0;
    private nextId: number = 0;

    constructor() {}

    public resize(width: number, height: number) {
        this.appWidth = width;
        this.appHeight = height;
    }

    public loadLevelData(data: any[]) {
        console.log('ResourceSystem (Logic) loading data');
        this.structures = [];
        this.nextId = 0;

        const w = this.appWidth || 1600;
        const h = this.appHeight || 800;

        data.forEach(d => {
            let x = d.x;
            let y = d.y;
            if (d.relative) {
                x *= w;
                y *= h;
            }

            let type = StructureType.RESOURCE_NODE;
            if (d.type === 'NEST') type = StructureType.NEST;
            else if (d.type === 'COOKIE') type = StructureType.COOKIE;
            else if (d.type === 'CASTLE') type = StructureType.CASTLE;
            else if (d.type === 'CRUCIBLE') type = StructureType.LEGACY_CRUCIBLE;
            else if (d.type === 'BUSH') type = StructureType.BUSH;

            const radius = (type === StructureType.CASTLE || type === StructureType.NEST || type === StructureType.LEGACY_CRUCIBLE) 
                ? CONFIG.CASTLE_RADIUS 
                : CONFIG.RESOURCE_NODE_RADIUS;

            const hp = d.health || d.energy || 100;

            this.structures.push({
                id: this.nextId++,
                type,
                x,
                y,
                radius,
                hp,
                maxHp: hp,
                energy: hp, 
                maxEnergy: 100,
                flashTimer: 0
            });
        });
    }

    public createRock(x: number, y: number, size: number) {
        const numPoints = Math.floor(Math.random() * 4) + 6; // 6 to 9 points
        const angles: number[] = [];
        for (let i = 0; i < numPoints; i++) {
            angles.push(Math.random() * Math.PI * 2);
        }
        angles.sort((a, b) => a - b);

        const vertices: number[] = [];
        for (const angle of angles) {
            const r = size * (0.7 + Math.random() * 0.3);
            vertices.push(Math.cos(angle) * r);
            vertices.push(Math.sin(angle) * r);
        }

        this.structures.push({
            id: this.nextId++,
            type: StructureType.ROCK,
            x,
            y,
            radius: size,
            hp: 100,
            maxHp: 100,
            energy: 0,
            maxEnergy: 0,
            flashTimer: 0,
            vertices
        });
    }

    public getObstacles(): StructureData[] {
        return this.structures.filter(s => s.type === StructureType.ROCK);
    }

    public removeStructureAt(x: number, y: number): boolean {
        for (let i = this.structures.length - 1; i >= 0; i--) {
            const s = this.structures[i];
            const dx = s.x - x;
            const dy = s.y - y;
            if (dx*dx + dy*dy < s.radius * s.radius) {
                this.structures.splice(i, 1);
                return true;
            }
        }
        return false;
    }

    public update(ticker: Ticker) {
        const dt = ticker.deltaTime;
        const seconds = dt / 60;
        
        for (const s of this.structures) {
            if (s.flashTimer > 0) {
                s.flashTimer -= dt;
                if (s.flashTimer < 0) s.flashTimer = 0;
            }

            if (s.type === StructureType.CASTLE || s.type === StructureType.LEGACY_CRUCIBLE || s.type === StructureType.NEST) {
                if (s.energy > 0) {
                    s.energy -= seconds;
                    if (s.energy < 0) s.energy = 0;
                }
            }
        }
    }

    public getStructures(): StructureData[] {
        return this.structures;
    }

    public getNestPosition(): {x: number, y: number} {
        const nest = this.structures.find(s => s.type === StructureType.NEST || s.type === StructureType.CASTLE || s.type === StructureType.LEGACY_CRUCIBLE);
        if (nest) {
            return { x: nest.x, y: nest.y };
        }
        return { x: this.appWidth / 2, y: this.appHeight / 2 };
    }
    
    public getCastlePosition(): {x: number, y: number} {
        return this.getNestPosition();
    }

    public damageStructure(typeOrId: string | number, xOrAmount: number, y?: number, amount?: number): boolean {
        if (typeof typeOrId === 'number') {
            const id = typeOrId;
            const amt = xOrAmount;
            const s = this.structures.find(st => st.id === id);
            if (s && s.hp > 0) {
                s.hp -= amt;
                if (s.hp < 0) s.hp = 0;
                s.flashTimer = 5;
                return true;
            }
            return false;
        } else {
            const type = typeOrId;
            const x = xOrAmount;
            const radius = 40; 
            const dmg = amount || 0;
            
            for (const s of this.structures) {
                if (s.type === type) { 
                    const dx = s.x - x;
                    const dy = s.y - (y || 0);
                    if (dx*dx + dy*dy < (s.radius + radius)**2) {
                        s.hp -= dmg;
                        s.flashTimer = 5;
                        return true;
                    }
                }
            }
            return false;
        }
    }

    public getNearestSource(x: number, y: number, radius: number): StructureData | null {
        let bestDistSq = radius * radius;
        let bestSource: StructureData | null = null;
        
        for (const s of this.structures) {
            if (s.type === StructureType.BUSH || s.type === StructureType.COOKIE || s.type === StructureType.RESOURCE_NODE) {
                const dx = s.x - x;
                const dy = s.y - y;
                const dSq = dx * dx + dy * dy;
                
                if (dSq < bestDistSq) {
                    bestDistSq = dSq;
                    bestSource = s;
                }
            }
        }
        
        return bestSource;
    }

    public isNearSource(x: number, y: number, radius: number = 40): boolean {
        for (const s of this.structures) {
            if (s.type === StructureType.BUSH || s.type === StructureType.COOKIE || s.type === StructureType.RESOURCE_NODE) {
                const rSq = (s.radius + radius)**2;
                const dx = x - s.x;
                const dy = y - s.y;
                if (dx*dx + dy*dy < rSq) return true;
            }
        }
        return false;
    }

    public isInsideCastle(x: number, y: number): boolean {
        const nest = this.structures.find(s => s.type === StructureType.NEST || s.type === StructureType.CASTLE || s.type === StructureType.LEGACY_CRUCIBLE);
        if (!nest) return false;
        
        const dx = x - nest.x;
        const dy = y - nest.y;
        return (dx*dx + dy*dy) < nest.radius**2;
    }

    public feedCastle(amount: number) {
        const nest = this.structures.find(s => s.type === StructureType.NEST || s.type === StructureType.CASTLE || s.type === StructureType.LEGACY_CRUCIBLE);
        if (nest) {
            nest.energy += amount;
            if (nest.energy > nest.maxEnergy) nest.energy = nest.maxEnergy;
        }
    }
    
    public getSinkType(): 'CASTLE' | 'CRUCIBLE' | 'NEST' | 'NONE' {
        const nest = this.structures.find(s => s.type === StructureType.NEST || s.type === StructureType.CASTLE || s.type === StructureType.LEGACY_CRUCIBLE);
        if (!nest) return 'NONE';
        if (nest.type === StructureType.NEST) return 'NEST';
        if (nest.type === StructureType.LEGACY_CRUCIBLE) return 'CRUCIBLE';
        return 'CASTLE';
    }
}