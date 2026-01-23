import { CONFIG } from '../../core/Config';
import { EntityData } from '../../data/EntityData';

export class EvolutionService {
    public static checkLevelUp(sprigs: EntityData, id: number) {
        // Haul Level
        this.checkHaulLevel(sprigs, id);
        
        // Fight Level
        this.checkFightLevel(sprigs, id);
    }

    private static checkHaulLevel(sprigs: EntityData, id: number) {
        if (sprigs.level_haul[id] >= CONFIG.LEVEL_CAP) {
            console.log(`Apprenticeship XP (Haul): ${sprigs.xp_haul[id]}`);
            return;
        }

        const currentLvl = sprigs.level_haul[id];
        const required = CONFIG.XP_BASE * (currentLvl + 1);

        if (sprigs.xp_haul[id] >= required) {
            sprigs.level_haul[id]++;
            sprigs.xp_haul[id] -= required;
            this.recalculateStats(sprigs, id);
            console.log(`Sprig [${id}] reached Haul Level ${sprigs.level_haul[id]}!`);
            this.checkHaulLevel(sprigs, id);
        }
    }

    private static checkFightLevel(sprigs: EntityData, id: number) {
        if (sprigs.level_fight[id] >= CONFIG.LEVEL_CAP) {
            console.log(`Apprenticeship XP (Fight): ${sprigs.xp_fight[id]}`);
            return;
        }

        const currentLvl = sprigs.level_fight[id];
        const required = CONFIG.XP_BASE * (currentLvl + 1);

        if (sprigs.xp_fight[id] >= required) {
            sprigs.level_fight[id]++;
            sprigs.xp_fight[id] -= required;
            this.recalculateStats(sprigs, id);
            console.log(`Sprig [${id}] reached Fight Level ${sprigs.level_fight[id]}!`);
            this.checkFightLevel(sprigs, id);
        }
    }

    public static recalculateStats(sprigs: EntityData, id: number) {
        // Base
        let maxHp = CONFIG.BASE_HP;
        let attack = CONFIG.BASE_ATTACK;
        let defense = CONFIG.BASE_DEFENSE;
        let capacity = CONFIG.BASE_CARRY_CAPACITY;

        // Haul Bonus
        const hLvl = sprigs.level_haul[id];
        maxHp += CONFIG.HP_PER_HAUL_LEVEL * hLvl;
        capacity += CONFIG.CARRY_PER_HAUL_LEVEL * hLvl;

        // Fight Bonus
        const fLvl = sprigs.level_fight[id];
        maxHp += CONFIG.HP_PER_FIGHT_LEVEL * fLvl;
        attack += CONFIG.ATTACK_PER_FIGHT_LEVEL * fLvl;
        defense += CONFIG.DEFENSE_PER_FIGHT_LEVEL * fLvl;

        // Apply
        sprigs.maxHp[id] = maxHp;
        sprigs.attack[id] = attack;
        sprigs.defense[id] = defense;
        sprigs.carryCapacity[id] = capacity;
        
        // Sync Stock Capacity
        sprigs.stock[id].setCapacity(capacity);

        // Heal
        sprigs.hp[id] = maxHp;
    }
}