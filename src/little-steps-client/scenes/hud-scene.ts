import Phaser from 'phaser';
import { ResourceVector } from '../levels/level-data';
import { EnergyGameResult, evaluatePerformance } from '../engine/energy-game-engine'

export class HudScene extends Phaser.Scene {
    private statusText!: Phaser.GameObjects.Text;
    private resourceText!: Phaser.GameObjects.Text;
    private previewText!: Phaser.GameObjects.Text;
    private hintText!: Phaser.GameObjects.Text;

    private winPopup?: Phaser.GameObjects.Container;
    private winPopupShown = false;

    constructor() {
        super('HudScene');
    }

    create(): void {
        const hudBg = this.add.rectangle(0, 0, 520, 140, 0x0a0f1e, 0.62)
            .setOrigin(0, 0);

        this.statusText = this.add.text(14, 12, '', {
            color: '#f6f8ff',
            fontSize: '18px',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2,
        });

        this.resourceText = this.add.text(14, 40, '', {
            color: '#53d98a',
            fontSize: '16px',
            stroke: '#000000',
            strokeThickness: 2,
        });

        this.previewText = this.add.text(14, 66, '', {
            color: '#f8c146',
            fontSize: '15px',
            stroke: '#000000',
            strokeThickness: 2,
        });

        this.hintText = this.add.text(14, 96, '', {
            color: '#c8d3ff',
            fontSize: '13px',
            stroke: '#000000',
            strokeThickness: 2,
        });

        const menuBtn = this.add.text(this.scale.width - 120, 20, '🏠 Menu', {
            fontSize: '18px',
            backgroundColor: '#34495e',
            padding: { x: 10, y: 5 }
        })
            .setInteractive({ useHandCursor: true });

        menuBtn.on('pointerdown', () => {
            this.registry.events.off('changedata', this.refreshStatus, this);
            this.scene.stop('MainScene');
            this.scene.start('MenuScene');
        });

        this.winPopupShown = false;
        
        this.registry.events.on('changedata', this.refreshStatus, this);
        this.events.once('shutdown', this.shutdown, this);
        
        this.refreshStatus();
    }

    private refreshStatus(): void {
        const node = this.registry.get('node');
        const goalReached = this.registry.get('goalReached');
        const nodeType = this.registry.get('nodeType');

        const goalText = goalReached ? ' | 🎉 Home reached!' : '';

        if (node !== undefined) {
            this.statusText.setText(`Node: ${node}${goalText}`);
        }

        const resources = this.registry.get('resources') as ResourceVector;
        if (resources) {
            this.resourceText.setText(`Time: ${resources.time}  |  Stamina: ${resources.stamina}  |  Bones: ${resources.bones}`);

            if (resources.time <= 10 || resources.stamina <= 5) {
                this.resourceText.setColor('#ff4d4d');
            } else {
                this.resourceText.setColor('#53d98a');
            }
        }

        const preview = this.registry.get('preview') as ResourceVector | null;
        if (preview) {
            this.previewText.setText(`Preview -> Time: ${preview.time}  |  Stamina: ${preview.stamina}  |  Bones: ${preview.bones}`);
        } else {
            this.previewText.setText('');
        }

        if (goalReached) {
            this.hintText.setText('Safe at home! Click Menu to play again.').setColor('#53d98a');
            if (!this.winPopupShown) {
                this.winPopupShown = true;
                this.showWinPopup();
            }
        } else if (nodeType === 'defender') {
            this.hintText.setText('⚠️ DEFENDER TURN: Puppy is moving automatically!').setColor('#9b59b6');
        } else {
            this.hintText.setText('Click a highlighted node to move.').setColor('#c8d3ff');
        }
    }

    private showWinPopup(): void {
        const initial = this.registry.get('initialResources') as ResourceVector | undefined;
        const final = this.registry.get('finalResources') as ResourceVector | undefined;
        const egResult = this.registry.get('energyGameResult') as EnergyGameResult | undefined;

        let feedbackLine = '🐾 Level complete!';
        let ratingColor = '#53d98a';

        if (initial && final && egResult) {
            const fb = evaluatePerformance(egResult, initial, final);
            feedbackLine = fb.message;
            ratingColor =
                fb.rating === 'perfect' ? '#f8c146' :
                    fb.rating === 'good' ? '#53d98a' :
                        '#c8d3ff';
        }

        const cx = this.scale.width / 2;
        const cy = this.scale.height / 2;
        const w = 420;
        const h = 240;

        const bg = this.add.rectangle(0, 0, w, h, 0x121a2f, 0.92)
            .setStrokeStyle(2, 0x87a1ff, 1);

        const title = this.add.text(0, -80, '🏠  Made it home!', {
            fontSize: '28px', fontStyle: 'bold', color: '#f6f8ff'
        }).setOrigin(0.5);

        const playerLeft = final?.time ?? 0;
        const optTime = egResult?.minBudget?.time;
        const optLeft = (initial && optTime !== undefined) ? initial.time - optTime : undefined;
        const resourceLine = this.add.text(0, -30,
            `Time left: ${playerLeft}${optLeft !== undefined ? `  /  Best possible: ${optLeft}` : ''}`,
            { fontSize: '17px', color: '#c8d3ff' }
        ).setOrigin(0.5);

        const feedback = this.add.text(0, 10, feedbackLine, {
            fontSize: '17px', color: ratingColor, wordWrap: { width: w - 40 }
        }).setOrigin(0.5);

        const btnBg = this.add.rectangle(0, 75, 160, 40, 0x34495e)
            .setInteractive({ useHandCursor: true });
        const btnTxt = this.add.text(0, 75, '🏠  Menu', {
            fontSize: '18px', color: '#f6f8ff'
        }).setOrigin(0.5);

        btnBg.on('pointerdown', () => {
            this.registry.events.off('changedata', this.refreshStatus, this);
            this.scene.stop('MainScene');
            this.scene.start('MenuScene');
        });

        this.winPopup = this.add.container(cx, cy, [bg, title, resourceLine, feedback, btnBg, btnTxt]);
        this.winPopup.setDepth(100);

        this.winPopup.setAlpha(0);
        this.tweens.add({ targets: this.winPopup, alpha: 1, duration: 400, ease: 'Power2' });
    }

    private shutdown(): void {
        this.registry.events.off('changedata', this.refreshStatus, this);
    }
}