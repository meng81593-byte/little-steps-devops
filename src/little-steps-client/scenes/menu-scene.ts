import Phaser from 'phaser';
import { LEVELS } from '../levels/index'; 

export class MenuScene extends Phaser.Scene {
    private levelSelectPanel!: Phaser.GameObjects.Container;

    constructor() {
        super('MenuScene');
    }

    preload() {
        this.load.image('menu_bg', 'assets/menu_bg.jpg'); 
        this.load.image('btn_start', 'assets/start.png');
        this.load.image('btn_options', 'assets/options.png');
        this.load.image('btn_exit', 'assets/exit.png');
    }

    create() {
        const { width, height } = this.scale;

        const bg = this.add.image(width / 2, height / 2, 'menu_bg');
        bg.setDisplaySize(width, height);


        
        this.createImageButton(475, 325, 'btn_start', () => {
            this.startGame(0); 
        });

        this.createImageButton(475, 320, 'btn_options', () => {
            this.showLevelSelectPanel(); 
        });

        this.createImageButton(475, 315, 'btn_exit', () => {
            this.exitGame(); 
        });

        this.createLevelSelectPanel();
    }

  
    private createImageButton(x: number, y: number, textureKey: string, onClick: () => void) {
        const btnImage = this.add.image(x, y, textureKey);
        
        
        btnImage.setScale(0.65);
        
        const baseScale = btnImage.scale;

       btnImage.setInteractive({ 
            useHandCursor: true, 
            pixelPerfect: true  
        });

        btnImage.on('pointerover', () => {
            this.tweens.add({ 
                targets: btnImage, 
                scale: baseScale * 1.01, 
                //y: y - 3,               
                duration: 150, 
                ease: 'Power2' 
            });
        });

        btnImage.on('pointerout', () => {
            this.tweens.add({ 
                targets: btnImage, 
                scale: baseScale, 
                y: y, 
                duration: 150, 
                ease: 'Power2' 
            });
        });

        btnImage.on('pointerdown', () => {
            this.tweens.add({
                targets: btnImage,
                scale: baseScale * 0.9, 
                y: y + 3,
                duration: 50,
                ease: 'Power2'
            });
        });

        btnImage.on('pointerup', () => {
            this.tweens.add({
                targets: btnImage,
                scale: baseScale * 1.1,
                y: y - 3,
                duration: 300,
                ease: 'Back.easeOut', 
                onComplete: onClick
            });
        });
    }

  
    private createLevelSelectPanel() {
    const { width, height } = this.scale;
    this.levelSelectPanel = this.add.container(0, 0);
    this.levelSelectPanel.setDepth(100).setAlpha(0).setVisible(false);

    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.6).setOrigin(0).setInteractive();
    
    const panelBg = this.add.rectangle(width / 2, height / 2, 400, 450, 0xFDFBF7, 1).setStrokeStyle(4, 0xDCD7CE, 1);
    const title = this.add.text(width / 2, height / 2 - 180, 'choose a level', { 
        fontSize: '24px', color: '#4A443C', fontStyle: 'bold', fontFamily: 'sans-serif' 
    }).setOrigin(0.5);

    this.levelSelectPanel.add([overlay, panelBg, title]);


    const START_Y = height / 2 - 120;
    const BTN_HEIGHT = 60;            
    const GAP = 15;                   

    LEVELS.forEach((level, index) => {
        const currentY = START_Y + index * (BTN_HEIGHT + GAP);
        
        const levelBtnText = this.add.text(width / 2, currentY, `Level ${index + 1}: ${level.title}`, {
            fontSize: '20px', 
            color: '#4A443C', 
            backgroundColor: '#E5E0D8', 
            padding: { x: 20, y: 10 },
            fontFamily: 'sans-serif'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        // 交互逻辑
        levelBtnText.on('pointerover', () => levelBtnText.setBackgroundColor('#F4E285'));
        levelBtnText.on('pointerout', () => levelBtnText.setBackgroundColor('#E5E0D8'));
        levelBtnText.on('pointerdown', () => this.startGame(index));

        this.levelSelectPanel.add(levelBtnText);
    });

    const closeBtn = this.add.text(width / 2, height / 2 + 180, '❌ close', {
        fontSize: '18px', color: '#FFFFFF', backgroundColor: '#D8A7B1', padding: { x: 15, y: 5 }, fontFamily: 'sans-serif'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    closeBtn.on('pointerdown', () => this.hideLevelSelectPanel());
    this.levelSelectPanel.add(closeBtn);
}

    private showLevelSelectPanel() {
        this.levelSelectPanel.setVisible(true);
        this.tweens.add({ targets: this.levelSelectPanel, alpha: 1, duration: 200, ease: 'Power2' });
    }

    private hideLevelSelectPanel() {
        this.tweens.add({ targets: this.levelSelectPanel, alpha: 0, duration: 200, ease: 'Power2', onComplete: () => this.levelSelectPanel.setVisible(false) });
    }

    private startGame(levelIndex: number) {
        this.cameras.main.fade(300, 0, 0, 0); 
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('MainScene', { levelIndex: levelIndex });
        });
    }

    private exitGame() {
        alert("thanks for your playing！");
    }
}