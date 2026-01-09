export class InputState {
    public static x: number = 0;
    public static y: number = 0;
    public static isDown: boolean = false;
    public static isRightDown: boolean = false;

    public static init(canvas: HTMLCanvasElement) {
        // Prevent default touch actions (scrolling/zooming)
        canvas.style.touchAction = 'none';

        // Prevent context menu on right click
        canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        canvas.addEventListener('pointerdown', (e) => {
            this.updateCoordinates(e, canvas);
            if (e.button === 2) {
                this.isRightDown = true;
            } else {
                this.isDown = true;
            }
            canvas.setPointerCapture(e.pointerId);
        });

        canvas.addEventListener('pointermove', (e) => {
            this.updateCoordinates(e, canvas);
        });

        canvas.addEventListener('pointerup', (e) => {
            if (e.button === 2) {
                this.isRightDown = false;
            } else {
                this.isDown = false;
            }
            canvas.releasePointerCapture(e.pointerId);
        });

        canvas.addEventListener('pointerout', (_e) => {
             // Optional: Handle out if needed, but capture usually handles it
             // keeping existing behavior of global up listener being removed
        });

        // Use window listener for up as a fallback for safety
        window.addEventListener('pointerup', (e) => {
            if (e.button === 2) {
                this.isRightDown = false;
            } else {
                this.isDown = false;
            }
        });
    }

    private static updateCoordinates(e: PointerEvent, canvas: HTMLCanvasElement) {
        const rect = canvas.getBoundingClientRect();
        this.x = e.clientX - rect.left;
        this.y = e.clientY - rect.top;
    }
}
