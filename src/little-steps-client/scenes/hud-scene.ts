import Phaser from 'phaser';
import { ResourceVector } from '../levels/level-data';
import { EnergyGameResult, evaluatePerformance } from '../engine/energy-game-engine';

export class HudScene extends Phaser.Scene {
    private statusText!: Phaser.GameObjects.Text;
    private hintText!: Phaser.GameObjects.Text;

    // UI Elements for Icons and Text
    private timeGroup!: Phaser.GameObjects.Group;
    private staminaGroup!: Phaser.GameObjects.Group;
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
        // Create a programmatic bone texture so we don't need external assets for it
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

        // Initialize Groups for the icons (replaces barsGraphics)
        this.timeGroup = this.add.group();
        this.staminaGroup = this.add.group();

        // Labels for the resource rows
        this.timeLabel = this.add.text(14, 46, 'TIME', {
            color: '#f1c40f', fontSize: '14px', fontStyle: 'bold', stroke: '#000000', strokeThickness: 2
        });
        this.staminaLabel = this.add.text(14, 76, 'STAM', {
            color: '#2ecc71', fontSize: '14px', fontStyle: 'bold', stroke: '#000000', strokeThickness: 2
        });

        // Text values to display next to the icons
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
        }).setInteractive({ useHandCursor: true });

        menuBtn.on('pointerdown', () => {
            this.registry.events.off('changedata', this.refreshStatus, this);
            this.scene.stop('MainScene');
            this.scene.start('MenuScene');
        });

        this.winPopupShown = false;

        // Listen for registry changes to update the HUD dynamically
        this.registry.events.on('changedata', this.refreshStatus, this);
        this.events.once('shutdown', this.shutdown, this);

        // Initial render
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
            // Draw Time Icons (heart) - Centers vertically around y=54 to align with text
            const timeEndX = this.drawIconBar(
                this.timeGroup, 65, 54, 'heart',
                resources.time, preview ? preview.time : null
            );

            // Draw Stamina Icons (fire) - Centers vertically around y=84
            const stamEndX = this.drawIconBar(
                this.staminaGroup, 65, 84, 'fire',
                resources.stamina, preview ? preview.stamina : null
            );

            // Dynamically position text directly after the drawn icons (min padding ensures it doesn't overlap labels)
            this.timeValueText.setPosition(Math.max(180, timeEndX + 15), 46);
            this.staminaValueText.setPosition(Math.max(180, stamEndX + 15), 76);

            // Update base text values
            this.timeValueText.setText(`${resources.time}`);
            this.staminaValueText.setText(`${resources.stamina}`);

            // Show preview text next to current values if available
            if (preview) {
                const timeDiff = preview.time - resources.time;
                const stamDiff = preview.stamina - resources.stamina;
                this.timeValueText.setText(`${resources.time}  ${timeDiff < 0 ? '⬇' : '⬆'} ${preview.time}`);
                this.staminaValueText.setText(`${resources.stamina}  ${stamDiff < 0 ? '⬇' : '⬆'} ${preview.stamina}`);

                // Color code the preview arrows and values
                this.timeValueText.setColor(timeDiff < 0 ? '#e74c3c' : (timeDiff > 0 ? '#00ffff' : '#ffffff'));
                this.staminaValueText.setColor(stamDiff < 0 ? '#e74c3c' : (stamDiff > 0 ? '#00ffff' : '#ffffff'));
            } else {
                // Low resource warning colors
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

        // Handle hinting and win states
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
     * Renders proportional icons (10 points = 1 icon) with preview support.
     * Automatically scales large images down and uses setCrop to seamlessly
     * combine normal parts and green/cost parts for fractional values.
     */
    private drawIconBar(
        group: Phaser.GameObjects.Group,
        startX: number,
        startY: number,
        textureKey: string,
        current: number,
        preview: number | null
    ): number {
        group.clear(true, true);

        // Retrieve the original pixel dimensions of the loaded texture
        const frame = this.textures.getFrame(textureKey);
        const origW = frame ? frame.width : 20;
        const origH = frame ? frame.height : 20;

        // Ensure 100 points (10 icons) roughly fit in ~200px width
        const targetWidth = 18; 
        const scale = targetWidth / origW; // Calculate the necessary scale factor
        const spacing = targetWidth + 2;   // 2px padding between icons

        // Determine the maximum value we need to draw (current or future preview)
        const maxVal = Math.max(current, preview !== null ? preview : current);
        const numIcons = Math.ceil(maxVal / 10);

        for (let i = 0; i < numIcons; i++) {
            const slotStart = i * 10;
            const slotEnd = slotStart + 10;
            const x = startX + i * spacing;

            // Determine the parts (normal, cost, gain) for THIS specific icon slot
            const baseEnd = preview !== null && preview < current ? preview : current;
            const normalPoints = Math.max(0, Math.min(baseEnd, slotEnd) - Math.max(0, slotStart));

            let costPoints = 0;
            if (preview !== null && preview < current) {
                const costStart = Math.max(slotStart, preview);
                const costEnd = Math.min(slotEnd, current);
                costPoints = Math.max(0, costEnd - costStart);
            }

            let gainPoints = 0;
            if (preview !== null && preview > current) {
                const gainStart = Math.max(slotStart, current);
                const gainEnd = Math.min(slotEnd, preview);
                gainPoints = Math.max(0, gainEnd - gainStart);
            }

            // 1. Draw Normal Base (Current Safe Amount)
            if (normalPoints > 0) {
                const img = this.add.image(x, startY, textureKey)
                    .setOrigin(0, 0.5)
                    .setScale(scale);
                
                // Crop uses original unscaled pixels
                if (normalPoints < 10) {
                    img.setCrop(0, 0, origW * (normalPoints / 10), origH);
                }
                group.add(img);
            }

            // 2. Draw Cost Amount (Upcoming Damage, Turns Green)
            if (costPoints > 0) {
                const img = this.add.image(x, startY, textureKey)
                    .setOrigin(0, 0.5)
                    .setScale(scale)
                    .setTintFill(0x00ff00); // Tint green for cost
                
                // Shift the crop rect start point so it seamlessly connects with the normal base
                const cropStartX = origW * (normalPoints / 10);
                const cropW = origW * (costPoints / 10);
                img.setCrop(cropStartX, 0, cropW, origH);
                group.add(img);
            }

            // 3. Draw Gain Amount (Upcoming Heal, Original Color)
            if (gainPoints > 0) {
                const img = this.add.image(x, startY, textureKey)
                    .setOrigin(0, 0.5)
                    .setScale(scale);
                
                const cropStartX = origW * (normalPoints / 10);
                const cropW = origW * (gainPoints / 10);
                img.setCrop(cropStartX, 0, cropW, origH);
                group.add(img);
            }
        }

        // Return the final X position to align text dynamically
        return startX + numIcons * spacing;
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