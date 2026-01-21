import { EntityData } from '../data/EntityData';
import { CONFIG } from '../core/Config';

export class CombatService {
    private sprigs: EntityData;

    constructor(sprigs: EntityData) {
        this.sprigs = sprigs;
    }

    public recalculateStats(id: number) {
        if (this.sprigs.active[id] === 0) return;

        // Reset to Base
        let maxHp = CONFIG.BASE_HP;
        let attack = CONFIG.BASE_ATTACK;
        let defense = CONFIG.BASE_DEFENSE;

        // Apply Hauler Levels
        const hLvl = this.sprigs.level_haul[id];
        maxHp += hLvl * 50;

        // Apply Fighter Levels
        const fLvl = this.sprigs.level_fight[id];
        maxHp += fLvl * 100;
        attack += fLvl * 5;

        // Commit
        this.sprigs.maxHp[id] = maxHp;
        this.sprigs.attack[id] = attack;
        this.sprigs.defense[id] = defense;
        
        // Heal to max on recalc? Or just clamp? Let's just clamp for now.
        // Actually, increasing maxHP usually doesn't heal you in games, but keeps percentage?
        // For simplicity: If current HP > new Max, clamp. If we want a heal effect, that's separate.
        if (this.sprigs.hp[id] > maxHp) {
            this.sprigs.hp[id] = maxHp;
        }
    }

    public applyDamage(targetId: number, amount: number): number {
        if (this.sprigs.active[targetId] === 0) return 0;

        const defense = this.sprigs.defense[targetId];
        const damage = Math.max(1, amount - defense + 1); // +1 ensures defense doesn't fully negate small hits (min 1 dmg)

        this.sprigs.hp[targetId] -= damage;

        if (this.sprigs.hp[targetId] <= 0) {
            this.killSprig(targetId);
        }

        return damage;
    }

    private killSprig(id: number) {
        this.sprigs.active[id] = 0;
        this.sprigs.count--;
        // Note: LifecycleSystem usually handles death effects (dropping crumbs).
        // Since this is a Service, we just mark inactive. 
        // Ideally we'd emit an event or let LifecycleSystem handle "dead" bodies next frame.
        // For now, immediate cleanup is fine for the "Physics" requirement.
    }
}
