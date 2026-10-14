import Phaser from 'phaser';
import type { MainScene } from './main-scene';
import { ResourceVector } from '../levels/level-data';
import { EnergyGameResult, evaluatePerformance } from '../engine/energy-game-engine';
import { CosmeticsState, COLOR_DEFS, ACCESSORY_DEFS, CLOTH_DEFS, unlockRewardForLevel, saveCosmetics } from '../cosmetics';
import { drawPixelPanel, makePixelButton, drawResourceIcon, PIXEL_FONT, PANEL_TEXT } from '../utils/pixel-panel';
import { applyPuppyPalette } from '../utils/puppy-palette';
import { isLevelUnlocked } from '../progress';

export class HudScene extends Phaser.Scene {
    private statusText!: Phaser.GameObjects.Text;
    private hintText!: Phaser.GameObjects.Text;

    // UI Elements for Icons and Text
    private timeGroup!: Phaser.GameObjects.Group;
    private staminaGroup!: Phaser.GameObjects.Group;
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
        this.createClockTexture();

        // A small journal corner leaves the map and character as the focal point.
        const paper = this.add.graphics();
        paper.fillStyle(0x49382c, 0.22).fillRect(14, 15, 300, 62);
        paper.fillStyle(0x795b40, 0.95).fillRect(12, 12, 300, 62);
        paper.fillStyle(0xe2e3de, 0.94).fillRect(14, 14, 296, 58);
        paper.fillStyle(0xf4f2e8, 0.5).fillRect(14, 14, 296, 1);
        const icons = this.add.graphics();
        drawResourceIcon(icons, 'time', 28, 30);
        drawResourceIcon(icons, 'stamina', 28, 56);
        drawResourceIcon(icons, 'bones', 264, 30);
        const style = { fontFamily: PIXEL_FONT, fontSize: '12px', fontStyle: 'bold', color: PANEL_TEXT };
        this.statusText = this.add.text(0, 0, '', style).setVisible(false);
        this.timeGroup = this.add.group();
        this.staminaGroup = this.add.group();
        this.add.text(40, 24, 'TIME', { ...style, fontSize: '10px' });
        this.add.text(40, 50, 'STAM', { ...style, fontSize: '10px' });
        this.timeValueText = this.add.text(164, 24, '', style);
        this.staminaValueText = this.add.text(164, 50, '', style);
        this.boneIcon = this.add.image(264, 30, 'bone_icon').setVisible(false);
        this.boneText = this.add.text(277, 24, '0', style);
        this.hintText = this.add.text(16, 82, '', { ...style, fontSize: '11px', color: '#F8F8F2', stroke: '#49382C', strokeThickness: 2, wordWrap: { width: 294 } });
        const menuBtn = makePixelButton(this, this.scale.width - 55, 32, 86, 'MENU').setScale(0.85);
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

    private createClockTexture() {
        if (this.textures.exists('clock')) return;
        const g = this.make.graphics({ x: 0, y: 0 });
        drawResourceIcon(g, 'time', 9, 9);
        g.generateTexture('clock', 18, 18); g.destroy();
    }

    private refreshStatus(): void {
        const node = this.registry.get('node');
        const goalReached = this.registry.get('goalReached');
        const nodeType = this.registry.get('nodeType');

        if (goalReached) {
            this.statusText.setText('HOME, SAFE AND SOUND');
        } else if (node !== undefined) {
            this.statusText.setText('YOUR TRAIL JOURNAL');
        }

        const resources = this.registry.get('resources') as ResourceVector;
        const initial = this.registry.get('initialResources') as ResourceVector;
        const preview = this.registry.get('preview') as ResourceVector | null;

        if (resources && initial) {
            // Draw Time Icons (clock) - Centers vertically around y=54 to align with text
            this.drawIconBar(
                this.timeGroup, 78, 30, 'clock',
                resources.time, preview ? preview.time : null
            );

            // Draw Stamina Icons (heart) - Centers vertically around y=84
            this.drawIconBar(
                this.staminaGroup, 78, 56, 'heart',
                resources.stamina, preview ? preview.stamina : null
            );

            // Dynamically position text directly after the drawn icons (min padding ensures it doesn't overlap labels)
            this.timeValueText.setPosition(164, 24);
            this.staminaValueText.setPosition(164, 50);

            // Update base text values
            this.timeValueText.setText(`${resources.time}`);
            this.staminaValueText.setText(`${resources.stamina}`);

            // Show preview text next to current values if available
            if (preview) {
                const timeDiff = preview.time - resources.time;
                const stamDiff = preview.stamina - resources.stamina;
                this.timeValueText.setText(timeDiff ? `${resources.time}  -> ${preview.time}` : `${resources.time}`);
                this.staminaValueText.setText(stamDiff ? `${resources.stamina}  -> ${preview.stamina}` : `${resources.stamina}`);

                // Color code the preview arrows and values
                this.timeValueText.setColor(timeDiff < 0 ? '#925548' : (timeDiff > 0 ? '#4A6842' : PANEL_TEXT));
                this.staminaValueText.setColor(stamDiff < 0 ? '#925548' : (stamDiff > 0 ? '#4A6842' : PANEL_TEXT));
            } else {
                // Low resource warning colors
                this.timeValueText.setColor(resources.time <= 10 ? '#925548' : PANEL_TEXT);
                this.staminaValueText.setColor(resources.stamina <= 5 ? '#925548' : PANEL_TEXT);
            }

            // Bone display: always visible; grey when 0, white when collected
            this.boneIcon.setVisible(false);
            this.boneText.setVisible(true);
            if (resources.bones > 0) {
                this.boneIcon.clearTint();
                this.boneText.setText(`${resources.bones}`).setColor(PANEL_TEXT);
            } else {
                this.boneIcon.setTint(0x888888);
                this.boneText.setText('0').setColor('#888888');
            }
        }

        // Handle hinting and win states
        if (goalReached) {
            this.hintText.setText('Safe at home! Click Menu to play again.').setColor('#4A6842');
            if (!this.winPopupShown) {
                this.winPopupShown = true;
                this.showWinPopup();
            }
        } else if (nodeType === 'defender') {
            this.hintText.setText('');
        } else {
            this.hintText.setText('').setColor('#77583E');
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
        const initial = this.registry.get('initialResources') as ResourceVector;
        const limit = Math.max(1, textureKey === 'clock' ? initial.time : initial.stamina, current, preview ?? 0);
        const g = this.add.graphics();
        group.add(g);
        for (let i = 0; i < 10; i++) {
            const x = startX + i * 8;
            g.fillStyle(0xc5c8bb).fillRect(x, startY - 3, 6, 6);
            const normal = Math.min(current, preview ?? current);
            const fill = Phaser.Math.Clamp(normal / limit * 10 - i, 0, 1);
            const before = Phaser.Math.Clamp(current / limit * 10 - i, 0, 1);
            const after = Phaser.Math.Clamp((preview ?? current) / limit * 10 - i, 0, 1);
            if (before > fill) g.fillStyle(0xcb9c82).fillRect(x, startY - 3, Math.round(before * 6), 6);
            if (after > before) g.fillStyle(0xb8cca1).fillRect(x, startY - 3, Math.round(after * 6), 6);
            if (fill > 0) g.fillStyle(textureKey === 'clock' ? 0xb3955c : 0x879f71).fillRect(x, startY - 3, Math.round(fill * 6), 6);
            if (fill > 0) g.fillStyle(0xffffff, 0.22).fillRect(x, startY - 3, Math.round(fill * 6), 1);
        }
        return startX + 80;
    }

    private showWinPopup(): void {
        const initial = this.registry.get('initialResources') as ResourceVector;
        const final = this.registry.get('finalResources') as ResourceVector;
        const result = this.registry.get('energyGameResult') as EnergyGameResult;
        const levelIndex = (this.registry.get('levelIndex') as number) ?? -1;
        const feedback = evaluatePerformance(result, initial, final, this.registry.get('goalReached') === true);
        const w = 480, h = 310;
        const bg = this.add.graphics(); drawPixelPanel(bg, w, h);
        const items: Phaser.GameObjects.GameObject[] = [bg];
        const label = (y: number, text: string, size = '15px', color = PANEL_TEXT) => this.add.text(0, y, text, { fontFamily: PIXEL_FONT, fontSize: size, color, align: 'center', fontStyle: 'bold', lineSpacing: 5, wordWrap: { width: w - 64 } }).setOrigin(0.5);
        items.push(label(-112, 'HOME, SAFE AND SOUND', '22px'));
        items.push(label(-58, feedback.message, '14px', '#4A6842'));
        items.push(label(-9, `TIME LEFT  ${final.time}     STAM LEFT  ${final.stamina}`));
        const chase = levelIndex === 3;
        const budget = result.minBudget;
        const note = !chase && budget ? `Resource estimate:\n${budget.time} time / ${budget.stamina} stamina` : 'You balanced your supplies and made it home.';
        items.push(label(42, note, '13px', '#77583E'));
        const goMenu = () => { this.registry.events.off('changedata', this.refreshStatus, this); this.scene.stop('MainScene'); this.scene.start('MenuScene'); };
        const menuBtnBg = makePixelButton(this, -145, 109, 122, 'MENU'); menuBtnBg.on('pointerdown', goMenu); items.push(menuBtnBg);
        if (levelIndex >= 1) {
            const rewardState = unlockRewardForLevel(levelIndex);
            const rewardBtnBg = makePixelButton(this, 0, 109, 142, 'WARDROBE');
            rewardBtnBg.on('pointerdown', () => this.showRewardPopup(levelIndex, rewardState)); items.push(rewardBtnBg);
        }
        if (levelIndex < 3 && isLevelUnlocked(levelIndex + 1)) {
            const nextBtn = makePixelButton(this, 148, 109, 126, 'NEXT TRAIL');
            nextBtn.on('pointerdown', () => { this.scene.stop('MainScene'); this.scene.start('MainScene', { levelIndex: levelIndex + 1 }); }); items.push(nextBtn);
        }
        this.winPopup = this.add.container(this.scale.width / 2, this.scale.height / 2, items).setName('win-popup').setDepth(100).setAlpha(0);
        this.tweens.add({ targets: this.winPopup, alpha: 1, duration: 240, ease: 'Sine.easeOut' });
    }

    private showRewardPopup(levelIndex: number, state: CosmeticsState): void {
        const { width: W, height: H } = this.scale;
        const mutableState: CosmeticsState = { ...state, unlockedColors: [...state.unlockedColors], unlockedAccessories: [...state.unlockedAccessories], unlockedClothes: [...state.unlockedClothes] };
        const panelW = 520, panelH = 360;
        const cx = W / 2, cy = H / 2;

        const overlay = this.add.rectangle(0, 0, W, H, 0x000000, 0.72).setOrigin(0).setDepth(200).setInteractive();

        const rewardTitles: Record<number, string> = {
            1: 'CHOOSE YOUR PUPPY COAT',
            2: 'CHOOSE AN ACCESSORY',
            3: 'CHOOSE AN OUTFIT',
        };

        const panelItems: Phaser.GameObjects.GameObject[] = [];
        const frame = this.add.graphics(); drawPixelPanel(frame, panelW, panelH); panelItems.push(frame);
        panelItems.push(this.add.text(0, -panelH / 2 + 32, rewardTitles[levelIndex] ?? '', { fontSize: '20px', fontStyle: 'bold', fontFamily: PIXEL_FONT, color: PANEL_TEXT }).setOrigin(0.5));
        panelItems.push(this.add.text(0, -panelH / 2 + 60, 'Click to select — puppy updates live!', { fontSize: '13px', color: '#77583E' }).setOrigin(0.5));

        const preview = this.add.sprite(0, -16, 'puppy_run').setScale(1.2).setOrigin(0.5, 0.9);
        panelItems.push(preview);
        const refreshPreview = () => { applyPuppyPalette(this, preview, mutableState.selectedColor, mutableState.selectedAccessory, mutableState.selectedCloth); preview.play(`puppy-walk-${preview.getData('look')}`); };
        refreshPreview();
        const notifyMainScene = () => { (this.scene.get('MainScene') as MainScene)?.applyCosmetics(); refreshPreview(); };

        if (levelIndex === 1) {
            const colors = COLOR_DEFS.filter(c => mutableState.unlockedColors.includes(c.id));
            const startX = -(colors.length * 58) / 2 + 29;
            const rings: Phaser.GameObjects.Arc[] = [];

            colors.forEach((def, i) => {
                const ox = startX + i * 58, oy = 40;
                const ring = this.add.circle(ox, oy, 27, 0x000000, 0).setStrokeStyle(3, 0x799266, mutableState.selectedColor === def.id ? 1 : 0);
                const swatch = this.add.circle(ox, oy, 22, def.swatch).setInteractive({ useHandCursor: true });
                const lbl = this.add.text(ox, oy + 36, def.label, { fontSize: '11px', fontFamily: PIXEL_FONT, color: PANEL_TEXT }).setOrigin(0.5);
                rings.push(ring);
                panelItems.push(ring, swatch, lbl);
                swatch.on('pointerdown', () => {
                    rings.forEach(r => r.setStrokeStyle(3, 0x799266, 0));
                    ring.setStrokeStyle(3, 0x799266, 1);
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
                const ox = -(accs.length * spacing) / 2 + spacing / 2 + i * spacing, oy = 40;
                const isSelected = mutableState.selectedAccessory === def.id;
                const btn = this.add.rectangle(ox, oy, btnW, 46, def.id === 'none' ? 0x34495e : def.color, 0.85).setStrokeStyle(isSelected ? 3 : 1, 0x799266, isSelected ? 1 : 0.35).setInteractive({ useHandCursor: true });
                const lbl = this.add.text(ox, oy, def.label, { fontSize: '13px', fontStyle: 'bold', color: '#fff', stroke: '#000', strokeThickness: 2 }).setOrigin(0.5);
                btns.push(btn);
                panelItems.push(btn, lbl);
                btn.on('pointerdown', () => {
                    btns.forEach(b => b.setStrokeStyle(1, 0x799266, 0.35));
                    btn.setStrokeStyle(3, 0x799266, 1);
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
                const ox = -(cloths.length * spacing) / 2 + spacing / 2 + i * spacing, oy = 40;
                const isSelected = mutableState.selectedCloth === def.id;
                const btn = this.add.rectangle(ox, oy, btnW, 46, def.id === 'none' ? 0x34495e : def.color, 0.85).setStrokeStyle(isSelected ? 3 : 1, 0x799266, isSelected ? 1 : 0.35).setInteractive({ useHandCursor: true });
                const lbl = this.add.text(ox, oy, def.label, { fontSize: '13px', fontStyle: 'bold', color: '#fff', stroke: '#000', strokeThickness: 2 }).setOrigin(0.5);
                btns.push(btn);
                panelItems.push(btn, lbl);
                btn.on('pointerdown', () => {
                    btns.forEach(b => b.setStrokeStyle(1, 0x799266, 0.35));
                    btn.setStrokeStyle(3, 0x799266, 1);
                    mutableState.selectedCloth = def.id;
                    saveCosmetics(mutableState);
                    notifyMainScene();
                });
            });
        }

        const doneBtn = makePixelButton(this, 0, panelH / 2 - 36, 202, 'SAVE & MENU');
        panelItems.push(doneBtn);

        const panel = this.add.container(cx, cy, panelItems).setDepth(201).setAlpha(0);
        doneBtn.on('pointerdown', () => {
            overlay.destroy();
            panel.destroy();
            this.registry.events.off('changedata', this.refreshStatus, this);
            this.scene.stop('MainScene');
            this.scene.start('MenuScene');
        });

        this.tweens.add({ targets: panel, alpha: 1, duration: 300, ease: 'Power2' });
    }

    private shutdown(): void {
        this.registry.events.off('changedata', this.refreshStatus, this);
    }
}
