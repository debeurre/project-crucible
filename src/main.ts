import { Application } from 'pixi.js';
import { Game } from './Game';

async function main() {
    const app = new Application();
    
    await app.init({
        resizeTo: window, 
        backgroundColor: 0x1a1a1a,
        antialias: true,
    });

    document.body.appendChild(app.canvas);

    // Disable right-click context menu
    document.body.addEventListener('contextmenu', (e) => e.preventDefault());
    
    new Game(app);
}

main();
