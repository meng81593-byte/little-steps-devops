import 'phaser';
import { MainScene } from './scenes/main-scene';
import { HudScene } from './scenes/hud-scene';

const config: Phaser.Types.Core.GameConfig = {
    width: 960,
    height: 640,
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [MainScene, HudScene],
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    }
};

export class Game extends Phaser.Game {
    constructor(gameConfig: Phaser.Types.Core.GameConfig) {
        super(gameConfig);
    }
}

window.addEventListener('load', () => {
    new Game(config);
});
