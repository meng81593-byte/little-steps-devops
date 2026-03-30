import Phaser from 'phaser';
import { LEVELS } from '../levels/index';

export class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }

    preload() {
        this.load.spritesheet('puppy_run', 'assets/Splayer_strip4.png', {
            frameWidth: 64,
            frameHeight: 64
        });
    }

    create() {
        const { width, height } = this.scale;

        const bgGraphics = this.add.graphics();
        bgGraphics.fillGradientStyle(0xdfffcd, 0xdfffcd, 0xb2ff59, 0xb2ff59, 1);
        bgGraphics.fillRect(0, 0, width, height);

        const titleShadow = this.add.text(width / 2 + 4, 134, 'Little Steps Home', {
            fontSize: '56px',
            color: '#000000',
            fontStyle: 'bold'
        }).setOrigin(0.5).setAlpha(0.3);

        const title = this.add.text(width / 2, 130, 'Little Steps Home', {
            fontSize: '56px',
            color: '#ffff00',
            fontStyle: 'bold',
            stroke: '#33691e',
            strokeThickness: 8
        }).setOrigin(0.5);

        this.tweens.add({
            targets: [title, titleShadow],
            y: '-=8',
            yoyo: true,
            repeat: -1,
            duration: 2000,
            ease: 'Sine.easeInOut'
        });

        this.anims.create({
            key: 'menu_idle',
            frames: this.anims.generateFrameNumbers('puppy_run', { start: 0, end: 3 }),
            frameRate: 6,
            repeat: -1
        });
        
        const puppy = this.add.sprite(width / 2 + 320, 125, 'puppy_run').setScale(1.5);
        puppy.play('menu_idle');

        this.createBoneParticles();

        LEVELS.forEach((level, index) => {
            const btn = this.add.container(width / 2, 280 + index * 100);
            
            const bg = this.add.rectangle(0, 0, 400, 70, 0xffffff, 0.5)
                .setStrokeStyle(4, 0x33691e)
                .setInteractive({ useHandCursor: true });
                
            const txt = this.add.text(0, 0, level.title, { 
                fontSize: '28px', 
                color: '#1a433e',
                fontStyle: 'bold' 
            }).setOrigin(0.5);
            
            btn.add([bg, txt]);

            bg.on('pointerdown', () => {
                this.cameras.main.fade(300, 255, 255, 255);
                this.cameras.main.once('camerafadeoutcomplete', () => {
                    this.scene.start('MainScene', { levelIndex: index });
                });
            });

            bg.on('pointerover', () => {
                bg.setFillStyle(0x33691e, 1);
                txt.setColor('#ffffff'); 
                this.tweens.add({
                    targets: btn,
                    scale: 1.08,
                    duration: 150,
                    ease: 'Power2'
                });
            });
            
            bg.on('pointerout', () => {
                bg.setFillStyle(0xffffff, 0.5);
                txt.setColor('#1a433e');
                this.tweens.add({
                    targets: btn,
                    scale: 1,
                    duration: 150,
                    ease: 'Power2'
                });
            });
        });

        const fullscreenBtn = this.add.text(width - 20, 20, '⛶ Fullscreen', {
            fontSize: '18px',
            color: '#33691e',
            backgroundColor: '#b2ff59',
            padding: { x: 15, y: 10 }
        })
        .setOrigin(1, 0)
        .setInteractive({ useHandCursor: true });

        fullscreenBtn.on('pointerover', () => {
            fullscreenBtn.setBackgroundColor('#33691e').setColor('#ffffff');
        });
        
        fullscreenBtn.on('pointerout', () => {
            fullscreenBtn.setBackgroundColor('#b2ff59').setColor('#33691e');
        });

        fullscreenBtn.on('pointerdown', () => {
            if (this.scale.isFullscreen) {
                this.scale.stopFullscreen();
                fullscreenBtn.setText('⛶ Fullscreen');
            } else {
                this.scale.startFullscreen();
                fullscreenBtn.setText('🗗 Windowed');
            }
        });
    }

    private createBoneParticles() {
        const { width } = this.scale;
        
        const boneGfx = this.make.graphics();
        boneGfx.fillStyle(0xffffff, 1);
        
        const w = 24;
        const h = 8;
        const r = 6;
        
        boneGfx.fillRoundedRect(r/2, r/2, w, h, h/2);
        boneGfx.fillCircle(r/2, h/2, r/2);
        boneGfx.fillCircle(r/2, h/2+r/2, r/2);
        boneGfx.fillCircle(w+r/2, h/2, r/2);
        boneGfx.fillCircle(w+r/2, h/2+r/2, r/2);
        
        boneGfx.generateTexture('boneParticle', w+r, h+r*2);
        boneGfx.destroy();

        const particles = this.add.particles(0, 0, 'boneParticle', {
            x: { min: 0, max: width },
            y: -20,
            lifespan: 8000,
            speedY: { min: 40, max: 100 },
            speedX: { min: -10, max: 10 },
            rotate: { 
                onEmit: () => Phaser.Math.Between(-180, 180),
                onUpdate: (particle: any) => particle.angle + 0.5
            },
            scale: { min: 0.3, max: 0.8 },
            alpha: { start: 0.1, end: 0.6, ease: 'Sine.easeInOut' },
            frequency: 250,
            quantity: 2,
            blendMode: 'ADD'
        });
        
        particles.setDepth(1);
    }
}