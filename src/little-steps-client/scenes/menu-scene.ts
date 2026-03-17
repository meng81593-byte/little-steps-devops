import Phaser from 'phaser';
import { LEVELS } from '../levels/index';

export class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }

    create() {
        const { width, height } = this.scale;

        this.add.text(width / 2, 100, 'Little Steps Home', {
            fontSize: '56px',
            color: '#f8c146',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        LEVELS.forEach((level, index) => {
            const btn = this.add.container(width / 2, 280 + index * 100);
            
            const bg = this.add.rectangle(0, 0, 400, 70, 0x5e70b5).setInteractive({ useHandCursor: true });
            const txt = this.add.text(0, 0, level.title, { 
                fontSize: '28px', 
                color: '#ffffff',
                fontStyle: 'bold' 
            }).setOrigin(0.5);
            
            btn.add([bg, txt]);

            bg.on('pointerdown', () => {
                this.scene.start('MainScene', { levelIndex: index });
            });

            bg.on('pointerover', () => {
                bg.setFillStyle(0x87a1ff);
                btn.setScale(1.05);
            });
            
            bg.on('pointerout', () => {
                bg.setFillStyle(0x5e70b5);
                btn.setScale(1);
            });
        });

        const fullscreenBtn = this.add.text(width - 20, 20, '[ Fullscreen ]', {
            fontSize: '20px',
            backgroundColor: '#34495e',
            padding: { x: 15, y: 10 }
        })
        .setOrigin(1, 0)
        .setInteractive({ useHandCursor: true });

        fullscreenBtn.on('pointerdown', () => {
            if (this.scale.isFullscreen) {
                this.scale.stopFullscreen();
            } else {
                this.scale.startFullscreen();
            }
        });
    }
}