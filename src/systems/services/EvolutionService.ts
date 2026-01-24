import { CONFIG } from '../../core/Config';
import { EntityData } from '../../data/EntityData';
import { WorldState } from '../../core/WorldState';
import { ParticleSystem } from '../ParticleSystem';

export class EvolutionService {
    public static checkLevelUp(world: WorldState, id: number) {
        // Haul Level
        this.checkHaulLevel(world, id);
        
        // Fight Level
        this.checkFightLevel(world, id);
    }

    public static addHaulXp(world: WorldState, id: number, amount: number) {
        const sprigs = world.sprigs;
        sprigs.xp_haul[id] += amount;
        // Small XP Text
        ParticleSystem.spawnFloatingText(world, sprigs.x[id], sprigs.y[id], `+${amount} XP`, 0xFFFFFF, 0.7);
        this.checkHaulLevel(world, id);
    }

    public static addFightXp(world: WorldState, id: number, amount: number) {
        const sprigs = world.sprigs;
        sprigs.xp_fight[id] += amount;
        // Small XP Text
        ParticleSystem.spawnFloatingText(world, sprigs.x[id], sprigs.y[id], `+${amount} XP`, 0xFF8888, 0.7);
        this.checkFightLevel(world, id);
    }

    private static checkHaulLevel(world: WorldState, id: number) {
        const sprigs = world.sprigs;
        if (sprigs.level_haul[id] >= CONFIG.LEVEL_CAP) {
            return;
        }

        const currentLvl = sprigs.level_haul[id];
        const required = CONFIG.XP_BASE * (currentLvl + 1);

        if (sprigs.xp_haul[id] >= required) {
            sprigs.level_haul[id]++;
            sprigs.xp_haul[id] -= required;
            this.recalculateStats(sprigs, id);
            
            // VFX
            ParticleSystem.spawnFloatingText(world, sprigs.x[id], sprigs.y[id], `HAUL UP!`, 0xFFD700, CONFIG.PARTICLE_TEXT_SCALE_LEVEL);
            ParticleSystem.spawnLevelUpFX(world, sprigs.x[id], sprigs.y[id]);
            
            console.log(`Sprig [${id}] reached Haul Level ${sprigs.level_haul[id]}!`);
            this.checkHaulLevel(world, id);
        }
    }

    private static checkFightLevel(world: WorldState, id: number) {
        const sprigs = world.sprigs;
        if (sprigs.level_fight[id] >= CONFIG.LEVEL_CAP) {
            return;
        }

        const currentLvl = sprigs.level_fight[id];
        const required = CONFIG.XP_BASE * (currentLvl + 1);

        if (sprigs.xp_fight[id] >= required) {
            sprigs.level_fight[id]++;
            sprigs.xp_fight[id] -= required;
            this.recalculateStats(sprigs, id);
            
            // VFX
            ParticleSystem.spawnFloatingText(world, sprigs.x[id], sprigs.y[id], `FIGHT UP!`, 0xFF4500, CONFIG.PARTICLE_TEXT_SCALE_LEVEL);
            ParticleSystem.spawnLevelUpFX(world, sprigs.x[id], sprigs.y[id]);

            console.log(`Sprig [${id}] reached Fight Level ${sprigs.level_fight[id]}!`);
            this.checkFightLevel(world, id);
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