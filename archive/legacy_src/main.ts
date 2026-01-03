import { Application, Assets, BitmapFont } from 'pixi.js';
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
    
    // Load Font
    await Assets.load('./fonts/Virgil.woff2');
    
    // Register as BitmapFont for performance
    BitmapFont.install({
        name: 'Virgil',
        style: {
            fontFamily: 'Virgil',
            fontSize: 32, 
            fill: 0xffffff, 
        }
    });

    new Game(app);
}

main();
