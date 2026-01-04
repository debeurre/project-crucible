export class InputState {
    public static x: number = 0;
    public static y: number = 0;
    public static isDown: boolean = false;
    public static isRightDown: boolean = false;

    public static init(canvas: HTMLCanvasElement) {
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
        });

        canvas.addEventListener('pointermove', (e) => {
            this.updateCoordinates(e, canvas);
        });

        window.addEventListener('pointerup', (e) => {
            // Window listener ensures we catch release even if mouse leaves canvas
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
        // In the future, apply camera transform here
    }
}
