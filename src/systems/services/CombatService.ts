import { CONFIG } from '../../core/Config';
import { EvolutionService } from './EvolutionService';
import { WorldState } from '../../core/WorldState';
import { EntityType } from '../../data/EntityData';
import { StructureType } from '../../data/StructureData';

export class CombatService {
    private world: WorldState;

    constructor(world: WorldState) {
        this.world = world;
    }

    public getEffectiveStats(id: number): { attack: number, defense: number } {
        const sprigs = this.world.sprigs;
        let attack = sprigs.attack[id];
        let defense = sprigs.defense[id];

        if (sprigs.type[id] === EntityType.THIEF && sprigs.homeID[id] !== -1) {
            const burrow = this.world.structures.find(s => s.id === sprigs.homeID[id]);
            if (burrow && burrow.type === StructureType.BURROW) {
                const dx = sprigs.x[id] - burrow.x;
                const dy = sprigs.y[id] - burrow.y;
                if (dx*dx + dy*dy < CONFIG.THIEF_CORNERED_RADIUS * CONFIG.THIEF_CORNERED_RADIUS) {
                    attack += CONFIG.THIEF_CORNERED_ATK;
                    defense += CONFIG.THIEF_CORNERED_DEF;
                }
            }
        }
        return { attack, defense };
    }

    public applyDamage(attackerId: number, targetId: number, amount: number): number {
        if (this.world.sprigs.active[targetId] === 0) return 0;

        // Calculate Damage
        const defense = this.getEffectiveStats(targetId).defense;
        const damage = Math.max(1, amount - defense + 1);

        this.world.sprigs.hp[targetId] -= damage;

        // XP for Attacker
        if (attackerId !== -1 && this.world.sprigs.active[attackerId] === 1) {
             this.world.sprigs.xp_fight[attackerId] += CONFIG.XP_PER_HIT;
             EvolutionService.checkLevelUp(this.world.sprigs, attackerId);
        }

        if (this.world.sprigs.hp[targetId] <= 0) {
            // Kill XP
            if (attackerId !== -1 && this.world.sprigs.active[attackerId] === 1) {
                this.world.sprigs.xp_fight[attackerId] += CONFIG.XP_PER_KILL;
                EvolutionService.checkLevelUp(this.world.sprigs, attackerId);
            }
            this.killSprig(targetId);
        }

        return damage;
    }

    private killSprig(id: number) {
        this.world.sprigs.active[id] = 0;
        this.world.sprigs.count--;
    }
}