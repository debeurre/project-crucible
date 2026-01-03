import { Container, BitmapText } from 'pixi.js';
import gsap from 'gsap';
import { CONFIG } from '../config';

export class FloatingTextSystem {
    public container: Container;
    private pool: BitmapText[] = [];

    constructor() {
        this.container = new Container();
    }

    public spawn(x: number, y: number, text: string, color: number) {
        let bmpText = this.pool.pop();

        if (!bmpText) {
            bmpText = new BitmapText({
                text: text,
                style: {
                    fontFamily: CONFIG.FLOATING_TEXT.FONT_FAMILY,
                    fontSize: CONFIG.FLOATING_TEXT.FONT_SIZE,
                    align: 'center',
                }
            });
            this.container.addChild(bmpText);
        }

        // Reset state
        bmpText.visible = true;
        bmpText.alpha = 1;
        bmpText.scale.set(0); 
        bmpText.position.set(x, y);
        bmpText.tint = color;
        bmpText.text = text; 
        bmpText.anchor.set(0.5); 

        // GSAP Timeline
        const tl = gsap.timeline({
            onComplete: () => {
                if (bmpText) {
                    bmpText.visible = false;
                    this.pool.push(bmpText);
                }
            }
        });

        // Stage 1: Pop (Scale 0 -> 1.5 -> 1.0 handled by back.out ease)
        // Spec says "Scale expansion... overshoot". back.out handles overshoot.
        // We'll target scale 1.0. The ease "back.out(3)" is quite bouncy, effectively going to 0 -> 1.X -> 1.
        tl.to(bmpText.scale, {
            x: CONFIG.FLOATING_TEXT.POP_TARGET_SCALE,
            y: CONFIG.FLOATING_TEXT.POP_TARGET_SCALE,
            duration: CONFIG.FLOATING_TEXT.POP_DURATION,
            ease: CONFIG.FLOATING_TEXT.POP_EASE
        });

        // Stage 2: Float & Fade
        // Overlap: Start 0.1s before Pop finishes
        const overlap = "-=0.1";

        tl.to(bmpText.position, {
            y: y - CONFIG.FLOATING_TEXT.FLOAT_DISTANCE,
            duration: CONFIG.FLOATING_TEXT.FLOAT_DURATION,
            ease: CONFIG.FLOATING_TEXT.FLOAT_EASE
        }, overlap);

        tl.to(bmpText, {
            alpha: 0,
            duration: CONFIG.FLOATING_TEXT.FLOAT_DURATION,
            ease: CONFIG.FLOATING_TEXT.FLOAT_EASE
        }, "<"); // Run parallel to position change
    }
}
