import Phaser from 'phaser';
import { ResourceVector } from '../levels/level-data';
import { EnergyGameResult, evaluatePerformance } from '../engine/energy-game-engine';

export class HudScene extends Phaser.Scene {
    private statusText!: Phaser.GameObjects.Text;
    private hintText!: Phaser.GameObjects.Text;

    // UI Elements for Bars and Icons
    private barsGraphics!: Phaser.GameObjects.Graphics;
    private timeLabel!: Phaser.GameObjects.Text;
    private staminaLabel!: Phaser.GameObjects.Text;
    private timeValueText!: Phaser.GameObjects.Text;
    private staminaValueText!: Phaser.GameObjects.Text;

    private boneIcon!: Phaser.GameObjects.Image;
    private boneText!: Phaser.GameObjects.Text;

    private winPopup?: Phaser.GameObjects.Container;
    private winPopupShown = false;

    constructor() {
        super('HudScene');
    }

    create(): void {
        // Create a programmatic bone texture so we don't need external assets
        this.createBoneTexture();

        // HUD Background
        this.add.rectangle(0, 0, 520, 140, 0x0a0f1e, 0.75)
            .setOrigin(0, 0)
            .setStrokeStyle(2, 0x34495e, 1);

        // Node & Status text (Top)
        this.statusText = this.add.text(14, 12, '', {
            color: '#f6f8ff',
            fontSize: '18px',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2,
        });

        // Initialize Graphics for the bars
        this.barsGraphics = this.add.graphics();

        // Labels for the bars
        this.timeLabel = this.add.text(14, 46, 'TIME', {
            color: '#f1c40f', fontSize: '14px', fontStyle: 'bold', stroke: '#000000', strokeThickness: 2
        });
        this.staminaLabel = this.add.text(14, 76, 'STAM', {
            color: '#2ecc71', fontSize: '14px', fontStyle: 'bold', stroke: '#000000', strokeThickness: 2
        });

        // Text values to display next to the bars
        this.timeValueText = this.add.text(280, 46, '', {
            color: '#ffffff', fontSize: '14px', fontStyle: 'bold', stroke: '#000000', strokeThickness: 2
        });
        this.staminaValueText = this.add.text(280, 76, '', {
            color: '#ffffff', fontSize: '14px', fontStyle: 'bold', stroke: '#000000', strokeThickness: 2
        });

        // Bone Icon and Text
        this.boneIcon = this.add.image(430, 60, 'bone_icon').setScale(1.5).setOrigin(0.5);
        this.boneText = this.add.text(455, 52, 'x 0', {
            color: '#ffffff', fontSize: '16px', fontStyle: 'bold', stroke: '#000000', strokeThickness: 2
        });

        // Hint Text (Bottom)
        this.hintText = this.add.text(14, 108, '', {
            color: '#c8d3ff',
            fontSize: '14px',
            stroke: '#000000',
            strokeThickness: 2,
        });

        // Menu Button
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

    // Generates a simple bone graphic dynamically
    private createBoneTexture() {
        if (this.textures.exists('bone_icon')) return;
        const boneGfx = this.make.graphics({ x: 0, y: 0 });
        boneGfx.fillStyle(0xffffff, 1);
        const w = 16, h = 6, r = 4;

        boneGfx.fillRoundedRect(r, r, w, h, h / 2);
        boneGfx.fillCircle(r, h / 2 + 1, r);
        boneGfx.fillCircle(r, h / 2 + r + 1, r);
        boneGfx.fillCircle(w + r, h / 2 + 1, r);
        boneGfx.fillCircle(w + r, h / 2 + r + 1, r);

        boneGfx.generateTexture('bone_icon', w + r * 2, h + r * 2);
        boneGfx.destroy();
    }

    private refreshStatus(): void {
        const node = this.registry.get('node');
        const goalReached = this.registry.get('goalReached');
        const nodeType = this.registry.get('nodeType');

        const goalText = goalReached ? ' | 🏁 Home reached!' : '';

        if (node !== undefined) {
            this.statusText.setText(`Node: ${node}${goalText}`);
        }

        const resources = this.registry.get('resources') as ResourceVector;
        const initial = this.registry.get('initialResources') as ResourceVector;
        const preview = this.registry.get('preview') as ResourceVector | null;

        if (resources && initial) {
            this.barsGraphics.clear();

            // Use initial resources as the baseline MAX for the bars, dynamically expand if current is higher
            const maxTime = Math.max(initial.time, resources.time, 1);
            const maxStamina = Math.max(initial.stamina, resources.stamina, 1);

            // Draw Time Bar (Yellow)
            this.drawProgressBar(
                this.barsGraphics, 65, 46, 200, 16,
                resources.time, maxTime, preview ? preview.time : null,
                0xf1c40f, 0xe74c3c, 0x00ffff
            );

            // Draw Stamina Bar (Green)
            this.drawProgressBar(
                this.barsGraphics, 65, 76, 200, 16,
                resources.stamina, maxStamina, preview ? preview.stamina : null,
                0x2ecc71, 0xe74c3c, 0x00ffff
            );

            // Update text values
            this.timeValueText.setText(`${resources.time}`);
            this.staminaValueText.setText(`${resources.stamina}`);

            // Show preview text next to current values if available
            if (preview) {
                const timeDiff = preview.time - resources.time;
                const stamDiff = preview.stamina - resources.stamina;
                this.timeValueText.setText(`${resources.time}  ${timeDiff < 0 ? '⬇' : '⬆'} ${preview.time}`);
                this.staminaValueText.setText(`${resources.stamina}  ${stamDiff < 0 ? '⬇' : '⬆'} ${preview.stamina}`);

                this.timeValueText.setColor(timeDiff < 0 ? '#e74c3c' : (timeDiff > 0 ? '#00ffff' : '#ffffff'));
                this.staminaValueText.setColor(stamDiff < 0 ? '#e74c3c' : (stamDiff > 0 ? '#00ffff' : '#ffffff'));
            } else {
                this.timeValueText.setColor(resources.time <= 10 ? '#e74c3c' : '#ffffff');
                this.staminaValueText.setColor(resources.stamina <= 5 ? '#e74c3c' : '#ffffff');
            }

            // Update Bone display (Hide icon if 0 bones)
            if (resources.bones > 0) {
                this.boneIcon.setVisible(true);
                this.boneText.setVisible(true);
                this.boneText.setText(`x ${resources.bones}`);
            } else {
                this.boneIcon.setVisible(false);
                this.boneText.setVisible(false);
            }
        }

        if (goalReached) {
            this.hintText.setText('Safe at home! Click Menu to play again.').setColor('#53d98a');
            if (!this.winPopupShown) {
                this.winPopupShown = true;
                this.showWinPopup();
            }
        } else if (nodeType === 'defender') {
            this.hintText.setText('⚠️ DEFENDER TURN: Puppy is moving automatically!').setColor('#e74c3c');
        } else {
            this.hintText.setText('Click a highlighted node to move.').setColor('#c8d3ff');
        }
    }

    /**
     * Draws a customized progress bar with optional preview damage/gain segments
     */
    private drawProgressBar(
        graphics: Phaser.GameObjects.Graphics,
        x: number, y: number, width: number, height: number,
        current: number, max: number, preview: number | null,
        mainColor: number, costColor: number, gainColor: number
    ) {
        // 1. Background (Dark)
        graphics.fillStyle(0x1a252f, 1);
        graphics.fillRoundedRect(x, y, width, height, 4);

        const currentRatio = Math.max(0, Math.min(1, current / max));
        const fillWidth = currentRatio * width;

        // 2. Base Fill
        graphics.fillStyle(mainColor, 1);
        graphics.fillRoundedRect(x, y, fillWidth, height, 4);

        // 3. Preview (Cost or Gain)
        if (preview !== null) {
            const previewRatio = Math.max(0, Math.min(1, preview / max));
            const prevWidth = previewRatio * width;

            if (preview < current) {
                // Draw a red "cost" block over the end of the current bar
                const costWidth = fillWidth - prevWidth;
                graphics.fillStyle(costColor, 1);
                // Draw as a normal rect to perfectly flush with the inner edge
                graphics.fillRect(x + prevWidth, y, costWidth, height);
            } else if (preview > current) {
                // Draw a cyan "gain" block extending from the current bar
                const gainWidth = prevWidth - fillWidth;
                graphics.fillStyle(gainColor, 1);
                graphics.fillRoundedRect(x, y, prevWidth, height, 4); // Redraw full with rounded corners
                graphics.fillStyle(mainColor, 1);
                graphics.fillRoundedRect(x, y, fillWidth, height, 4); // Draw main color back over it
            }
        }

        // 4. Border Outline
        graphics.lineStyle(2, 0xffffff, 0.2);
        graphics.strokeRoundedRect(x, y, width, height, 4);
    }

    private showWinPopup(): void {
        const initial = this.registry.get('initialResources') as ResourceVector | undefined;
        const final = this.registry.get('finalResources') as ResourceVector | undefined;
        const egResult = this.registry.get('energyGameResult') as EnergyGameResult | undefined;

        let feedbackLine = '🎉 Level complete!';
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

        const bg = this.add.rectangle(0, 0, w, h, 0x121a2f, 0.95)
            .setStrokeStyle(3, 0x87a1ff, 1);

        const title = this.add.text(0, -80, '🏠 Made it home!', {
            fontSize: '28px', fontStyle: 'bold', color: '#f6f8ff'
        }).setOrigin(0.5);

        const playerLeft = final?.time ?? 0;
        const optTime = egResult?.minBudget?.time;
        const optLeft = (initial && optTime !== undefined) ? initial.time - optTime : undefined;
        const resourceLine = this.add.text(0, -30,
            `Time left: ${playerLeft}${optLeft !== undefined ? `  /  Best possible: ${optLeft}` : ''}`,
            { fontSize: '17px', color: '#c8d3ff' }
        ).setOrigin(0.5);

        const feedback = this.add.text(0, 15, feedbackLine, {
            fontSize: '18px', color: ratingColor, wordWrap: { width: w - 40 }, align: 'center', fontStyle: 'bold'
        }).setOrigin(0.5);

        const btnBg = this.add.rectangle(0, 80, 160, 40, 0x34495e)
            .setInteractive({ useHandCursor: true });
        const btnTxt = this.add.text(0, 80, '🏠 Menu', {
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