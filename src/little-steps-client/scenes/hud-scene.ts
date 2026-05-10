import Phaser from 'phaser';
import { ResourceVector } from '../levels/level-data';
import { EnergyGameResult, evaluatePerformance } from '../engine/energy-game-engine';
import { CosmeticsState, COLOR_DEFS, ACCESSORY_DEFS, CLOTH_DEFS, unlockRewardForLevel, saveCosmetics } from '../cosmetics';

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

            // Bone display: always visible; grey when 0, white when collected
            this.boneIcon.setVisible(true);
            this.boneText.setVisible(true);
            if (resources.bones > 0) {
                this.boneIcon.clearTint();
                this.boneText.setText(`x ${resources.bones}`).setColor('#ffffff');
            } else {
                this.boneIcon.setTint(0x888888);
                this.boneText.setText('x 0').setColor('#888888');
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
        const levelIndex = (this.registry.get('levelIndex') as number) ?? -1;

        let feedbackLine = '🎉 Level complete!';
        let ratingColor = '#53d98a';

        if (initial && final && egResult) {
            const fb = evaluatePerformance(egResult, initial, final);
            feedbackLine = fb.message;
            ratingColor = fb.rating === 'perfect' ? '#f8c146' : fb.rating === 'good' ? '#53d98a' : '#c8d3ff';
        }

        const cx = this.scale.width / 2;
        const cy = this.scale.height / 2;
        const w = 420, h = 240;

        const bg = this.add.rectangle(0, 0, w, h, 0x121a2f, 0.95).setStrokeStyle(3, 0x87a1ff, 1);
        const title = this.add.text(0, -80, '🏠 Made it home!', { fontSize: '28px', fontStyle: 'bold', color: '#f6f8ff' }).setOrigin(0.5);

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

        const hasReward = levelIndex >= 1 && levelIndex <= 3;
        const items: Phaser.GameObjects.GameObject[] = [bg, title, resourceLine, feedback];

        const goMenu = () => {
            this.registry.events.off('changedata', this.refreshStatus, this);
            this.scene.stop('MainScene');
            this.scene.start('MenuScene');
        };

        if (hasReward) {
            const rewardState = unlockRewardForLevel(levelIndex);

            const rewardBtnBg = this.add.rectangle(-95, 80, 170, 40, 0xFFD700).setInteractive({ useHandCursor: true });
            const rewardBtnTxt = this.add.text(-95, 80, '🎁 Customize', { fontSize: '15px', fontStyle: 'bold', color: '#1a1a1a' }).setOrigin(0.5);
            const menuBtnBg = this.add.rectangle(95, 80, 130, 40, 0x34495e).setInteractive({ useHandCursor: true });
            const menuBtnTxt = this.add.text(95, 80, '🏠 Menu', { fontSize: '15px', color: '#f6f8ff' }).setOrigin(0.5);

            rewardBtnBg.on('pointerdown', () => this.showRewardPopup(levelIndex, rewardState));
            menuBtnBg.on('pointerdown', goMenu);
            items.push(rewardBtnBg, rewardBtnTxt, menuBtnBg, menuBtnTxt);
        } else {
            const btnBg = this.add.rectangle(0, 80, 160, 40, 0x34495e).setInteractive({ useHandCursor: true });
            const btnTxt = this.add.text(0, 80, '🏠 Menu', { fontSize: '18px', color: '#f6f8ff' }).setOrigin(0.5);
            btnBg.on('pointerdown', goMenu);
            items.push(btnBg, btnTxt);
        }

        this.winPopup = this.add.container(cx, cy, items).setDepth(100).setAlpha(0);
        this.tweens.add({ targets: this.winPopup, alpha: 1, duration: 400, ease: 'Power2' });
    }

    private showRewardPopup(levelIndex: number, state: CosmeticsState): void {
        const { width: W, height: H } = this.scale;
        const mutableState: CosmeticsState = { ...state, unlockedColors: [...state.unlockedColors], unlockedAccessories: [...state.unlockedAccessories], unlockedClothes: [...state.unlockedClothes] };
        const panelW = 500, panelH = 300;
        const cx = W / 2, cy = H / 2;

        const overlay = this.add.rectangle(0, 0, W, H, 0x000000, 0.72).setOrigin(0).setDepth(200).setInteractive();

        const rewardTitles: Record<number, string> = {
            1: '🎨 Choose Your Puppy Color',
            2: '🎀 Choose an Accessory',
            3: '👔 Choose an Outfit',
        };

        const panelItems: Phaser.GameObjects.GameObject[] = [];
        panelItems.push(this.add.rectangle(0, 0, panelW, panelH, 0x0d1b2a, 0.97).setStrokeStyle(3, 0xFFD700, 1));
        panelItems.push(this.add.text(0, -panelH / 2 + 32, rewardTitles[levelIndex] ?? '', { fontSize: '20px', fontStyle: 'bold', color: '#FFD700' }).setOrigin(0.5));
        panelItems.push(this.add.text(0, -panelH / 2 + 60, 'Click to select — puppy updates live!', { fontSize: '13px', color: '#c8d3ff' }).setOrigin(0.5));

        const notifyMainScene = () => (this.scene.get('MainScene') as any)?.applyCosmetics?.();

        if (levelIndex === 1) {
            const colors = COLOR_DEFS.filter(c => mutableState.unlockedColors.includes(c.id));
            const startX = -(colors.length * 58) / 2 + 29;
            const rings: Phaser.GameObjects.Arc[] = [];

            colors.forEach((def, i) => {
                const ox = startX + i * 58, oy = -10;
                const ring = this.add.circle(ox, oy, 27, 0x000000, 0).setStrokeStyle(3, 0xFFD700, mutableState.selectedColor === def.id ? 1 : 0);
                const swatch = this.add.circle(ox, oy, 22, def.swatch).setInteractive({ useHandCursor: true });
                const lbl = this.add.text(ox, oy + 36, def.label, { fontSize: '11px', color: '#cccccc' }).setOrigin(0.5);
                rings.push(ring);
                panelItems.push(ring, swatch, lbl);
                swatch.on('pointerdown', () => {
                    rings.forEach(r => r.setStrokeStyle(3, 0xFFD700, 0));
                    ring.setStrokeStyle(3, 0xFFD700, 1);
                    mutableState.selectedColor = def.id;
                    saveCosmetics(mutableState);
                    notifyMainScene();
                });
            });
        } else if (levelIndex === 2) {
            const accs = ACCESSORY_DEFS.filter(a => mutableState.unlockedAccessories.includes(a.id));
            const btnW = Math.min(138, Math.floor((panelW - 40) / accs.length) - 8);
            const spacing = btnW + 8;
            const btns: Phaser.GameObjects.Rectangle[] = [];
            accs.forEach((def, i) => {
                const ox = -(accs.length * spacing) / 2 + spacing / 2 + i * spacing, oy = -10;
                const isSelected = mutableState.selectedAccessory === def.id;
                const btn = this.add.rectangle(ox, oy, btnW, 46, def.id === 'none' ? 0x34495e : def.color, 0.85).setStrokeStyle(isSelected ? 3 : 1, 0xFFD700, isSelected ? 1 : 0.35).setInteractive({ useHandCursor: true });
                const lbl = this.add.text(ox, oy, def.label, { fontSize: '13px', fontStyle: 'bold', color: '#fff', stroke: '#000', strokeThickness: 2 }).setOrigin(0.5);
                btns.push(btn);
                panelItems.push(btn, lbl);
                btn.on('pointerdown', () => {
                    btns.forEach(b => b.setStrokeStyle(1, 0xFFD700, 0.35));
                    btn.setStrokeStyle(3, 0xFFD700, 1);
                    mutableState.selectedAccessory = def.id;
                    saveCosmetics(mutableState);
                    notifyMainScene();
                });
            });
        } else if (levelIndex === 3) {
            const cloths = CLOTH_DEFS.filter(c => mutableState.unlockedClothes.includes(c.id));
            const btnW = Math.min(138, Math.floor((panelW - 40) / cloths.length) - 8);
            const spacing = btnW + 8;
            const btns: Phaser.GameObjects.Rectangle[] = [];
            cloths.forEach((def, i) => {
                const ox = -(cloths.length * spacing) / 2 + spacing / 2 + i * spacing, oy = -10;
                const isSelected = mutableState.selectedCloth === def.id;
                const btn = this.add.rectangle(ox, oy, btnW, 46, def.id === 'none' ? 0x34495e : def.color, 0.85).setStrokeStyle(isSelected ? 3 : 1, 0xFFD700, isSelected ? 1 : 0.35).setInteractive({ useHandCursor: true });
                const lbl = this.add.text(ox, oy, def.label, { fontSize: '13px', fontStyle: 'bold', color: '#fff', stroke: '#000', strokeThickness: 2 }).setOrigin(0.5);
                btns.push(btn);
                panelItems.push(btn, lbl);
                btn.on('pointerdown', () => {
                    btns.forEach(b => b.setStrokeStyle(1, 0xFFD700, 0.35));
                    btn.setStrokeStyle(3, 0xFFD700, 1);
                    mutableState.selectedCloth = def.id;
                    saveCosmetics(mutableState);
                    notifyMainScene();
                });
            });
        }

        const doneBtn = this.add.rectangle(0, panelH / 2 - 36, 190, 42, 0x27ae60).setStrokeStyle(2, 0xffffff, 0.7).setInteractive({ useHandCursor: true });
        const doneTxt = this.add.text(0, panelH / 2 - 36, '✓ Save & Menu', { fontSize: '16px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
        panelItems.push(doneBtn, doneTxt);

        let panel: Phaser.GameObjects.Container;
        doneBtn.on('pointerdown', () => {
            overlay.destroy();
            panel.destroy();
            this.registry.events.off('changedata', this.refreshStatus, this);
            this.scene.stop('MainScene');
            this.scene.start('MenuScene');
        });

        panel = this.add.container(cx, cy, panelItems).setDepth(201).setAlpha(0);
        this.tweens.add({ targets: panel, alpha: 1, duration: 300, ease: 'Power2' });
    }

    private shutdown(): void {
        this.registry.events.off('changedata', this.refreshStatus, this);
    }
}