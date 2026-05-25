import Phaser from 'phaser';
import { LEVELS } from '../levels/index';
import { loadCosmetics, saveCosmetics, COLOR_DEFS, ACCESSORY_DEFS, CLOTH_DEFS, CosmeticsState } from '../cosmetics';
import { drawAccessoryOnGfx, drawClothOnGfx } from '../utils/draw-utils';

export class MenuScene extends Phaser.Scene {
    private levelSelectPanel!: Phaser.GameObjects.Container;
    private optionsPanel!: Phaser.GameObjects.Container;
    private cosmeticsPanel!: Phaser.GameObjects.Container;
    private cosmeticsState!: CosmeticsState;
    private musicMuted = false;
    private bgm?: Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound;
    private previewPuppy?: Phaser.GameObjects.Sprite;
    private previewClothGfx?: Phaser.GameObjects.Graphics;
    private previewAccessoryGfx?: Phaser.GameObjects.Graphics;
    private cosmeticsBtns = new Map<string, Phaser.GameObjects.Text>();
    private lockedCosmeticKeys = new Set<string>();

    constructor() {
        super('MenuScene');
    }

    preload() {
        this.load.image('menu_bg', 'assets/menu_bg.jpg');
        this.load.image('titre',   'assets/titre.png');
        this.load.image('btn_start', 'assets/start.png');
        this.load.image('btn_options', 'assets/options.png');
        this.load.image('btn_exit', 'assets/exit.png');
        this.load.spritesheet('puppy_run', 'assets/Splayer_strip4.png', { frameWidth: 64, frameHeight: 64 });
        this.load.audio('bgm', 'assets/bgm.ogg');
    }

    create() {
        const { width, height } = this.scale;

        const bg = this.add.image(width / 2, height / 2, 'menu_bg');
        bg.setDisplaySize(width, height);

        this.bgm = this.sound.add('bgm', { loop: true, volume: 0.5 }) as Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound;
        this.bgm.play();

        // Title sign (transparent PNG, 614×406)
        this.add.image(10, 5, 'titre')
            .setOrigin(0, 0)
            .setDisplaySize(385, 218)
            .setDepth(1);

        this.createImageButton(475, 325, 'btn_start', () => {
            this.showLevelSelectPanel();
        });

        this.createImageButton(475, 320, 'btn_options', () => {
            this.showOptionsPanel();
        });

        this.createImageButton(475, 315, 'btn_exit', () => {
            this.exitGame();
        });

        this.createOptionsPanel();
        this.createCosmeticsPanel();
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
        const cx = width / 2, cy = height / 2;

        const cosmeticsState = loadCosmetics();
        const unlockedLevels = new Set([0, 1]);
        if (cosmeticsState.unlockedColors.length > 1) unlockedLevels.add(2);
        if (cosmeticsState.unlockedAccessories.some(id => id !== 'none')) unlockedLevels.add(3);

        const DESCRIPTIONS = [
            'Find your way home.',
            'Watch your stamina.',
            'Fog of war awaits.',
            'Outrun the chasing cat.',
        ];

        this.levelSelectPanel = this.add.container(0, 0);
        this.levelSelectPanel.setDepth(100).setAlpha(0).setVisible(false);

        // Pixel palette
        const C_BORDER  = 0x2C1810;
        const C_HEADER  = 0x4A2810;
        const C_PANEL   = 0xEDD9A3;
        const C_ROW     = 0xF5E8C8;
        const C_LOCKED  = 0xBAAA90;
        const C_HOVER   = 0xFFD060;
        const C_BADGE   = 0x4A2810;
        const C_BDGLOCK = 0x7A6A58;
        const FONT      = '"Courier New", monospace';

        const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.65).setOrigin(0).setInteractive();

        // Panel
        const border  = this.add.rectangle(cx, cy, 448, 432, C_BORDER, 1);
        const panelBg = this.add.rectangle(cx, cy, 440, 424, C_PANEL, 1);

        // Header strip
        const headerBg   = this.add.rectangle(cx, cy - 190, 440, 52, C_HEADER, 1);
        const headerLine  = this.add.rectangle(cx, cy - 164, 440, 3, C_BORDER, 1);
        const titleText   = this.add.text(cx, cy - 190, '* CHOOSE A LEVEL *', {
            fontSize: '18px', color: '#F5E6C0', fontStyle: 'bold', fontFamily: FONT,
            padding: { x: 0, y: 6 },
        }).setOrigin(0.5);

        this.levelSelectPanel.add([overlay, border, panelBg, headerBg, headerLine, titleText]);

        const ROW_START_Y = cy - 113;
        const ROW_STEP    = 76;

        LEVELS.forEach((level, index) => {
            const rowCY    = ROW_START_Y + index * ROW_STEP;
            const unlocked = unlockedLevels.has(index);

            // Rounded row
            const rowGfx = this.add.graphics();
            const drawRow = (fill: number) => {
                rowGfx.clear();
                rowGfx.fillStyle(C_BORDER, 1);
                rowGfx.fillRoundedRect(cx - 151, rowCY - 31, 302, 62, 12);
                rowGfx.fillStyle(fill, 1);
                rowGfx.fillRoundedRect(cx - 149, rowCY - 29, 298, 58, 10);
            };
            drawRow(unlocked ? C_ROW : C_LOCKED);

            const rowHit = this.add.rectangle(cx, rowCY, 298, 58, 0x000000, 0.001);

            // Rounded badge
            const badgeGfx = this.add.graphics();
            badgeGfx.fillStyle(C_BORDER, 1);
            badgeGfx.fillRoundedRect(cx - 137, rowCY - 16, 32, 32, 8);
            badgeGfx.fillStyle(unlocked ? C_BADGE : C_BDGLOCK, 1);
            badgeGfx.fillRoundedRect(cx - 135, rowCY - 14, 28, 28, 6);

            const badgeLabel = this.add.text(cx - 121, rowCY, unlocked ? String(index + 1) : '?', {
                fontSize: '15px', color: '#F5E6C0', fontStyle: 'bold', fontFamily: FONT,
            }).setOrigin(0.5);

            const levelTitle = this.add.text(cx - 95, rowCY - 10, level.title, {
                fontSize: '16px', color: unlocked ? '#2C1810' : '#7A6A58',
                fontStyle: 'bold', fontFamily: '"Nunito", sans-serif',
                stroke: unlocked ? '#2C1810' : '#7A6A58', strokeThickness: 2,
                letterSpacing: 2,
            }).setOrigin(0, 0.5);

            const lockTag = !unlocked
                ? this.add.text(cx + 123, rowCY - 10, '[LOCKED]', {
                    fontSize: '10px', color: '#7A6A58', fontFamily: FONT,
                }).setOrigin(1, 0.5)
                : null;

            const desc = this.add.text(cx - 95, rowCY + 13, DESCRIPTIONS[index], {
                fontSize: '11px', color: unlocked ? '#5A4030' : '#8A7A68', fontFamily: FONT,
            }).setOrigin(0, 0.5);

            const toAdd: Phaser.GameObjects.GameObject[] = [rowGfx, rowHit, badgeGfx, badgeLabel, levelTitle, desc];
            if (lockTag) toAdd.push(lockTag);
            this.levelSelectPanel.add(toAdd);

            if (unlocked) {
                rowHit.setInteractive({ useHandCursor: true });
                rowHit.on('pointerover', () => drawRow(C_HOVER));
                rowHit.on('pointerout',  () => drawRow(C_ROW));
                rowHit.on('pointerdown', () => this.startGame(index));
            }
        });

        // Rounded close button
        const closeGfx  = this.add.graphics();
        const drawClose = (fill: number) => {
            closeGfx.clear();
            closeGfx.fillStyle(C_BORDER, 1);
            closeGfx.fillRoundedRect(cx - 52, cy + 170, 104, 34, 9);
            closeGfx.fillStyle(fill, 1);
            closeGfx.fillRoundedRect(cx - 50, cy + 172, 100, 30, 7);
        };
        drawClose(C_HEADER);
        const closeHit  = this.add.rectangle(cx, cy + 187, 100, 30, 0x000000, 0.001)
            .setInteractive({ useHandCursor: true });
        const closeText = this.add.text(cx, cy + 187, '[ CLOSE ]', {
            fontSize: '13px', color: '#F5E6C0', fontStyle: 'bold', fontFamily: FONT,
        }).setOrigin(0.5);
        closeHit.on('pointerover', () => drawClose(0x6A3818));
        closeHit.on('pointerout',  () => drawClose(C_HEADER));
        closeHit.on('pointerdown', () => this.hideLevelSelectPanel());
        this.levelSelectPanel.add([closeGfx, closeHit, closeText]);
    }

    private showLevelSelectPanel() {
        if (this.levelSelectPanel) this.levelSelectPanel.destroy(true);
        this.createLevelSelectPanel();
        this.levelSelectPanel.setVisible(true);
        this.tweens.add({ targets: this.levelSelectPanel, alpha: 1, duration: 200, ease: 'Power2' });
    }

    private hideLevelSelectPanel() {
        this.tweens.add({
            targets: this.levelSelectPanel, alpha: 0, duration: 200, ease: 'Power2',
            onComplete: () => this.levelSelectPanel?.setVisible(false),
        });
    }

    // ── Options panel ────────────────────────────────────────────────────────────

    private createOptionsPanel() {
        const { width, height } = this.scale;
        const cx = width / 2, cy = height / 2;
        this.optionsPanel = this.add.container(0, 0);
        this.optionsPanel.setDepth(100).setAlpha(0).setVisible(false);

        const C_BORDER = 0x2C1810, C_HEADER = 0x4A2810, C_PANEL = 0xEDD9A3;
        const C_ROW = 0xF5E8C8, C_HOVER = 0xFFD060;
        const FONT = '"Courier New", monospace';

        const overlay  = this.add.rectangle(0, 0, width, height, 0x000000, 0.65).setOrigin(0).setInteractive();
        const border   = this.add.rectangle(cx, cy, 330, 280, C_BORDER, 1);
        const panelBg  = this.add.rectangle(cx, cy, 322, 272, C_PANEL, 1);
        const headerBg = this.add.rectangle(cx, cy - 118, 322, 44, C_HEADER, 1);
        const headerLn = this.add.rectangle(cx, cy - 96, 322, 3, C_BORDER, 1);
        const titleTxt = this.add.text(cx, cy - 118, '* OPTIONS *', {
            fontSize: '16px', color: '#F5E6C0', fontStyle: 'bold', fontFamily: FONT,
            padding: { x: 0, y: 6 },
        }).setOrigin(0.5);
        this.optionsPanel.add([overlay, border, panelBg, headerBg, headerLn, titleTxt]);

        const makeRowBtn = (labelFn: () => string, btnCY: number, onClick: () => void) => {
            const gfx = this.add.graphics();
            const draw = (fill: number) => {
                gfx.clear();
                gfx.fillStyle(C_BORDER, 1);
                gfx.fillRoundedRect(cx - 111, btnCY - 21, 222, 42, 10);
                gfx.fillStyle(fill, 1);
                gfx.fillRoundedRect(cx - 109, btnCY - 19, 218, 38, 8);
            };
            draw(C_ROW);
            const hit = this.add.rectangle(cx, btnCY, 218, 38, 0x000000, 0.001).setInteractive({ useHandCursor: true });
            const txt = this.add.text(cx, btnCY, labelFn(), {
                fontSize: '14px', color: '#2C1810', fontStyle: 'bold', fontFamily: FONT,
                stroke: '#2C1810', strokeThickness: 1,
            }).setOrigin(0.5);
            hit.on('pointerover',  () => draw(C_HOVER));
            hit.on('pointerout',   () => draw(C_ROW));
            hit.on('pointerdown',  () => { onClick(); txt.setText(labelFn()); });
            this.optionsPanel.add([gfx, hit, txt]);
        };

        makeRowBtn(() => this.musicMuted ? 'MUSIC : OFF' : 'MUSIC : ON', cy - 52, () => {
            this.musicMuted = !this.musicMuted;
            if (this.bgm) this.musicMuted ? this.bgm.pause() : this.bgm.resume();
        });

        makeRowBtn(() => 'WARDROBE', cy + 18, () => {
            this.hideOptionsPanel();
            this.showCosmeticsPanel();
        });

        const closeGfx  = this.add.graphics();
        const drawClose = (fill: number) => {
            closeGfx.clear();
            closeGfx.fillStyle(C_BORDER, 1);
            closeGfx.fillRoundedRect(cx - 52, cy + 90, 104, 34, 9);
            closeGfx.fillStyle(fill, 1);
            closeGfx.fillRoundedRect(cx - 50, cy + 92, 100, 30, 7);
        };
        drawClose(C_HEADER);
        const closeHit  = this.add.rectangle(cx, cy + 107, 100, 30, 0x000000, 0.001).setInteractive({ useHandCursor: true });
        const closeTxt  = this.add.text(cx, cy + 107, '[ CLOSE ]', {
            fontSize: '13px', color: '#F5E6C0', fontStyle: 'bold', fontFamily: FONT,
        }).setOrigin(0.5);
        closeHit.on('pointerover', () => drawClose(0x6A3818));
        closeHit.on('pointerout',  () => drawClose(C_HEADER));
        closeHit.on('pointerdown', () => this.hideOptionsPanel());
        this.optionsPanel.add([closeGfx, closeHit, closeTxt]);
    }

    private showOptionsPanel() {
        this.optionsPanel.setVisible(true);
        this.tweens.add({ targets: this.optionsPanel, alpha: 1, duration: 200, ease: 'Power2' });
    }

    private hideOptionsPanel() {
        this.tweens.add({ targets: this.optionsPanel, alpha: 0, duration: 200, ease: 'Power2', onComplete: () => this.optionsPanel.setVisible(false) });
    }

    private startGame(levelIndex: number) {
        this.bgm?.stop();
        this.cameras.main.fade(300, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('MainScene', { levelIndex: levelIndex });
        });
    }

    private exitGame() {
        alert("thanks for your playing！");
    }

    // ── Cosmetics panel ─────────────────────────────────────────────────────────

    private createCosmeticsPanel() {
        const { width, height } = this.scale;
        const cx = width / 2, cy = height / 2;
        this.cosmeticsState = loadCosmetics();
        this.cosmeticsPanel = this.add.container(0, 0);
        this.cosmeticsPanel.setDepth(100).setAlpha(0).setVisible(false);
        this.cosmeticsBtns.clear();
        this.lockedCosmeticKeys.clear();

        const C_BORDER = 0x2C1810, C_HEADER = 0x4A2810, C_PANEL = 0xEDD9A3;
        const FONT = '"Courier New", monospace';

        const overlay  = this.add.rectangle(0, 0, width, height, 0x000000, 0.65).setOrigin(0).setInteractive();
        const border   = this.add.rectangle(cx, cy, 548, 524, C_BORDER, 1);
        const panelBg  = this.add.rectangle(cx, cy, 540, 516, C_PANEL, 1);
        const headerBg = this.add.rectangle(cx, cy - 235, 540, 44, C_HEADER, 1);
        const headerLn = this.add.rectangle(cx, cy - 213, 540, 2, C_BORDER, 1);
        const titleTxt = this.add.text(cx, cy - 235, '* WARDROBE *', {
            fontSize: '16px', color: '#F5E6C0', fontStyle: 'bold', fontFamily: FONT,
            padding: { x: 0, y: 6 },
        }).setOrigin(0.5);
        this.cosmeticsPanel.add([overlay, border, panelBg, headerBg, headerLn, titleTxt]);

        // ── Preview area ──────────────────────────────────────────────────────
        const prevGfx = this.add.graphics();
        prevGfx.fillStyle(C_BORDER, 1);
        prevGfx.fillRoundedRect(cx - 72, cy - 210, 144, 171, 8);
        prevGfx.fillStyle(0xF5E8C8, 1);
        prevGfx.fillRoundedRect(cx - 70, cy - 208, 140, 167, 6);
        this.cosmeticsPanel.add(prevGfx);

        const PUPPY_Y = cy - 55;
        this.previewPuppy = this.add.sprite(cx, PUPPY_Y, 'puppy_run').setFrame(0).setScale(1.5).setOrigin(0.5, 0.9);
        this.previewClothGfx = this.add.graphics().setPosition(cx, PUPPY_Y - 35);
        this.previewAccessoryGfx = this.add.graphics().setPosition(cx, PUPPY_Y - 78);
        this.cosmeticsPanel.add([this.previewPuppy, this.previewClothGfx, this.previewAccessoryGfx]);
        this.refreshCosmeticsPreview();

        // ── Section builder ───────────────────────────────────────────────────
        const BX = [-180, -90, 0, 90, 180].map(o => cx + o);

        const addRow = (
            labelText: string, rowY: number,
            items: { id: string; label: string; swatch?: number }[],
            isUnlocked: (id: string) => boolean,
            catKey: string,
        ) => {
            const lbl = this.add.text(cx, rowY - 22, '— ' + labelText + ' —', {
                fontSize: '11px', color: '#4A2810', fontStyle: 'bold', fontFamily: FONT,
            }).setOrigin(0.5);
            this.cosmeticsPanel.add(lbl);

            items.forEach((item, i) => {
                const bx = BX[i];
                const unlocked = isUnlocked(item.id);
                const key = `${catKey}:${item.id}`;

                if (item.swatch !== undefined) {
                    const dot = this.add.graphics();
                    dot.fillStyle(C_BORDER, 1);
                    dot.fillCircle(bx, rowY, 13);
                    dot.fillStyle(unlocked ? item.swatch : 0xBAAA90, 1);
                    dot.fillCircle(bx, rowY, 11);
                    this.cosmeticsPanel.add(dot);
                }

                const btn = this.add.text(bx, rowY + (item.swatch !== undefined ? 22 : 0), item.label, {
                    fontSize: '11px',
                    color: unlocked ? '#2C1810' : '#7A6A58',
                    backgroundColor: '#F5E8C8',
                    padding: { x: 6, y: 3 },
                    fontFamily: FONT,
                }).setOrigin(0.5);
                this.cosmeticsPanel.add(btn);
                this.cosmeticsBtns.set(key, btn);
                if (!unlocked) this.lockedCosmeticKeys.add(key);

                if (unlocked) {
                    btn.setInteractive({ useHandCursor: true });
                    btn.on('pointerover', () => btn.setBackgroundColor('#FFD060'));
                    btn.on('pointerout',  () => this.updateCosmeticsHighlights());
                    btn.on('pointerdown', () => this.selectCosmetic(catKey, item.id));
                }
            });
        };

        addRow('Color', cy - 10,
            COLOR_DEFS.map(d => ({ id: d.id, label: d.label, swatch: d.swatch })),
            id => this.cosmeticsState.unlockedColors.includes(id as any), 'color');

        addRow('Accessory', cy + 90,
            ACCESSORY_DEFS.map(d => ({ id: d.id, label: d.label })),
            id => this.cosmeticsState.unlockedAccessories.includes(id as any), 'acc');

        addRow('Clothes', cy + 155,
            CLOTH_DEFS.map(d => ({ id: d.id, label: d.label })),
            id => this.cosmeticsState.unlockedClothes.includes(id as any), 'cloth');

        const closeGfx  = this.add.graphics();
        const drawClose = (fill: number) => {
            closeGfx.clear();
            closeGfx.fillStyle(C_BORDER, 1);
            closeGfx.fillRoundedRect(cx - 52, cy + 208, 104, 34, 9);
            closeGfx.fillStyle(fill, 1);
            closeGfx.fillRoundedRect(cx - 50, cy + 210, 100, 30, 7);
        };
        drawClose(C_HEADER);
        const closeHit  = this.add.rectangle(cx, cy + 225, 100, 30, 0x000000, 0.001).setInteractive({ useHandCursor: true });
        const closeTxt  = this.add.text(cx, cy + 225, '[ CLOSE ]', {
            fontSize: '13px', color: '#F5E6C0', fontStyle: 'bold', fontFamily: FONT,
        }).setOrigin(0.5);
        closeHit.on('pointerover', () => drawClose(0x6A3818));
        closeHit.on('pointerout',  () => drawClose(C_HEADER));
        closeHit.on('pointerdown', () => this.hideCosmeticsPanel());
        this.cosmeticsPanel.add([closeGfx, closeHit, closeTxt]);

        this.updateCosmeticsHighlights();
    }

    private selectCosmetic(cat: string, id: string) {
        if (cat === 'color') this.cosmeticsState.selectedColor = id as any;
        else if (cat === 'acc') this.cosmeticsState.selectedAccessory = id as any;
        else this.cosmeticsState.selectedCloth = id as any;
        saveCosmetics(this.cosmeticsState);
        this.refreshCosmeticsPreview();
        this.updateCosmeticsHighlights();
    }

    private refreshCosmeticsPreview() {
        if (!this.previewPuppy) return;
        const s = this.cosmeticsState;

        const colorDef = COLOR_DEFS.find(d => d.id === s.selectedColor);
        if (colorDef?.tint != null) this.previewPuppy.setTint(colorDef.tint);
        else this.previewPuppy.clearTint();

        this.previewClothGfx?.clear();
        if (this.previewClothGfx) drawClothOnGfx(this.previewClothGfx, s.selectedCloth);

        this.previewAccessoryGfx?.clear();
        if (this.previewAccessoryGfx) drawAccessoryOnGfx(this.previewAccessoryGfx, s.selectedAccessory);
    }

    private updateCosmeticsHighlights() {
        this.cosmeticsBtns.forEach((btn, key) => {
            if (this.lockedCosmeticKeys.has(key)) return;
            const [cat, id] = key.split(':');
            const selected =
                (cat === 'color' && this.cosmeticsState.selectedColor === id) ||
                (cat === 'acc'   && this.cosmeticsState.selectedAccessory === id) ||
                (cat === 'cloth' && this.cosmeticsState.selectedCloth === id);
            btn.setBackgroundColor(selected ? '#FFD060' : '#F5E8C8');
        });
    }

    private showCosmeticsPanel() {
        this.cosmeticsState = loadCosmetics();
        this.refreshCosmeticsPreview();
        this.updateCosmeticsHighlights();
        this.cosmeticsPanel.setVisible(true);
        this.tweens.add({ targets: this.cosmeticsPanel, alpha: 1, duration: 200, ease: 'Power2' });
    }

    private hideCosmeticsPanel() {
        this.tweens.add({
            targets: this.cosmeticsPanel, alpha: 0, duration: 200, ease: 'Power2',
            onComplete: () => this.cosmeticsPanel.setVisible(false),
        });
    }
}