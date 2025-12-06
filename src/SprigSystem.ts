import { Application, Graphics, Point, Container } from 'pixi.js';
import { CONFIG } from './config';
import { InputState } from './InputManager';
import { MapSystem } from './systems/MapSystem';

interface Sprig {
    sprite: Graphics;
    position: Point;
    velocity: Point;
    trail: Point[];
    flashTimer: number; // For visual feedback without setTimeout
}

export class SprigSystem {
    private sprigs: Sprig[] = [];
    private app: Application;
    private mapSystem: MapSystem;
    private parentContainer: Container;

    constructor(app: Application, mapSystem: MapSystem, parentContainer: Container) {
        this.app = app;
        this.mapSystem = mapSystem;
        this.parentContainer = parentContainer;
        this.initSprigs();
    }

    private initSprigs() {
        for (let i = 0; i < CONFIG.SPRIG_COUNT; i++) {
            const sprite = new Graphics();
            
            // Pixi v8 Style: Chainable geometry + fill
            sprite.circle(0, 0, CONFIG.SPRIG_RADIUS)
                  .fill(CONFIG.SPRIG_COLOR);

            // Random Position
            const position = new Point(
                Math.random() * this.app.screen.width,
                Math.random() * this.app.screen.height
            );
            
            // Set sprite position initially
            sprite.position.copyFrom(position);

            this.sprigs.push({
                sprite,
                position,
                velocity: new Point(Math.random() * 2 - 1, Math.random() * 2 - 1),
                trail: [],
                flashTimer: 0
            });

            this.parentContainer.addChild(sprite);
        }
    }
    
    // ...

    public update(inputState: InputState) {
        for (const sprig of this.sprigs) {
            this.applyBoids(sprig);
            this.applyPheromonePath(sprig, inputState.path);
            this.applyPulse(sprig, inputState.pulse);
            this.updatePosition(sprig);
            this.updateVisuals(sprig); // Handle trails and colors
        }
    }

    private applyBoids(sprig: Sprig) {
        let sepX = 0, sepY = 0;
        let aliX = 0, aliY = 0;
        let cohX = 0, cohY = 0;
        let neighborCount = 0;

        for (const other of this.sprigs) {
            if (sprig === other) continue;

            const dx = sprig.position.x - other.position.x;
            const dy = sprig.position.y - other.position.y;
            const distSq = dx * dx + dy * dy;
            const radiusSq = CONFIG.PERCEPTION_RADIUS * CONFIG.PERCEPTION_RADIUS;

            if (distSq > 0 && distSq < radiusSq) {
                const distance = Math.sqrt(distSq);

                // Separation
                sepX += (dx / distance) / distance;
                sepY += (dy / distance) / distance;

                // Alignment
                aliX += other.velocity.x;
                aliY += other.velocity.y;

                // Cohesion
                cohX += other.position.x;
                cohY += other.position.y;

                neighborCount++;
            }
        }

        if (neighborCount > 0) {
            // Normalize and Apply Forces
            // 1. Alignment
            aliX /= neighborCount;
            aliY /= neighborCount;
            const aliLen = Math.sqrt(aliX * aliX + aliY * aliY);
            if (aliLen > 0) {
                aliX = (aliX / aliLen) * CONFIG.ALIGNMENT_FORCE;
                aliY = (aliY / aliLen) * CONFIG.ALIGNMENT_FORCE;
            }

            // 2. Cohesion
            cohX /= neighborCount;
            cohY /= neighborCount;
            cohX -= sprig.position.x;
            cohY -= sprig.position.y;
            const cohLen = Math.sqrt(cohX * cohX + cohY * cohY);
            if (cohLen > 0) {
                cohX = (cohX / cohLen) * CONFIG.COHESION_FORCE;
                cohY = (cohY / cohLen) * CONFIG.COHESION_FORCE;
            }

            // 3. Separation
            const sepLen = Math.sqrt(sepX * sepX + sepY * sepY);
            if (sepLen > 0) {
                sepX = (sepX / sepLen) * CONFIG.SEPARATION_FORCE;
                sepY = (sepY / sepLen) * CONFIG.SEPARATION_FORCE;
            }

            sprig.velocity.x += sepX + aliX + cohX;
            sprig.velocity.y += sepY + aliY + cohY;
        }
    }

    private applyPheromonePath(sprig: Sprig, path: Point[]) {
        if (path.length === 0) return;

        let closestX = 0;
        let closestY = 0;
        let minDistSq = Infinity;

        // Find closest point on path
        for (const point of path) {
            const dx = sprig.position.x - point.x;
            const dy = sprig.position.y - point.y;
            const dSq = dx * dx + dy * dy;
            if (dSq < minDistSq) {
                minDistSq = dSq;
                closestX = point.x;
                closestY = point.y;
            }
        }

        // Check if within range (squared check is faster)
        const rangeSq = (CONFIG.PERCEPTION_RADIUS * 2) ** 2;
        
        if (minDistSq < rangeSq) {
            // Attraction Force
            const dx = closestX - sprig.position.x;
            const dy = closestY - sprig.position.y;
            const dist = Math.sqrt(minDistSq);
            
            if (dist > 0) {
                const normX = dx / dist;
                const normY = dy / dist;
                
                sprig.velocity.x += normX * CONFIG.PHEROMONE_PATH_ATTRACTION;
                sprig.velocity.y += normY * CONFIG.PHEROMONE_PATH_ATTRACTION;
            }

            // Trigger visual flash
            sprig.flashTimer = 5; // Flash for 5 frames
        }
    }

    private applyPulse(sprig: Sprig, pulse: Point | null) {
        if (!pulse) return;

        const dx = sprig.position.x - pulse.x;
        const dy = sprig.position.y - pulse.y;
        const distSq = dx * dx + dy * dy;
        const radiusSq = CONFIG.PULSE_RADIUS * CONFIG.PULSE_RADIUS;

        if (distSq < radiusSq) {
            const dist = Math.sqrt(distSq);
            if (dist > 0) {
                const normX = dx / dist;
                const normY = dy / dist;
                // Force falls off with distance
                const force = CONFIG.PULSE_FORCE / (dist * 0.1 + 1);
                
                sprig.velocity.x += normX * force;
                sprig.velocity.y += normY * force;
            }
        }
    }

    private updatePosition(sprig: Sprig) {
        // Calculate speed squared
        const speedSq = sprig.velocity.x * sprig.velocity.x + sprig.velocity.y * sprig.velocity.y;
        const maxSq = CONFIG.MAX_SPEED * CONFIG.MAX_SPEED;

        // Clamp speed
        if (speedSq > maxSq) {
            const speed = Math.sqrt(speedSq);
            const scale = CONFIG.MAX_SPEED / speed;
            sprig.velocity.x *= scale;
            sprig.velocity.y *= scale;
        }

        // Move
        sprig.position.x += sprig.velocity.x;
        sprig.position.y += sprig.velocity.y;

        // Delegate boundary checks to MapSystem
        this.mapSystem.constrain(sprig.position, sprig.velocity);
    }

    private updateVisuals(sprig: Sprig) {
        // Sync Sprite Position
        sprig.sprite.x = sprig.position.x;
        sprig.sprite.y = sprig.position.y;

        // Handle Flash Effect
        if (sprig.flashTimer > 0) {
            sprig.sprite.tint = CONFIG.SPRIG_FLASH_COLOR;
            sprig.flashTimer--;
        } else {
            sprig.sprite.tint = CONFIG.SPRIG_COLOR;
        }

        // Update Trail (Simple version)
        // Only add point every 5 frames to save memory? 
        // For now, simple push/shift is okay for small trails.
        // We clone explicitly because 'position' changes every frame.
        sprig.trail.push(new Point(sprig.position.x, sprig.position.y));
        if (sprig.trail.length > CONFIG.TRAIL_LENGTH) {
            sprig.trail.shift();
        }
    }
}