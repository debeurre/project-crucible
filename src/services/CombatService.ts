import { EntityData } from '../data/EntityData';
import { CONFIG } from '../core/Config';
import { EvolutionService } from '../systems/evolution/EvolutionService';

export class CombatService {
    private sprigs: EntityData;

    constructor(sprigs: EntityData) {
        this.sprigs = sprigs;
    }

    public applyDamage(attackerId: number, targetId: number, amount: number): number {
        if (this.sprigs.active[targetId] === 0) return 0;

        // Calculate Damage
        const defense = this.sprigs.defense[targetId];
        const damage = Math.max(1, amount - defense + 1);

        this.sprigs.hp[targetId] -= damage;

        // XP for Attacker
        if (attackerId !== -1 && this.sprigs.active[attackerId] === 1) {
             this.sprigs.xp_fight[attackerId] += CONFIG.XP_PER_HIT;
             EvolutionService.checkLevelUp(this.sprigs, attackerId);
        }

        if (this.sprigs.hp[targetId] <= 0) {
            // Kill XP
            if (attackerId !== -1 && this.sprigs.active[attackerId] === 1) {
                this.sprigs.xp_fight[attackerId] += CONFIG.XP_PER_KILL;
                EvolutionService.checkLevelUp(this.sprigs, attackerId);
            }
            this.killSprig(targetId);
        }

        return damage;
    }

    private killSprig(id: number) {
        this.sprigs.active[id] = 0;
        this.sprigs.count--;
    }
}