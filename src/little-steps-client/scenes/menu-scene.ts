import Phaser from 'phaser';
import { LEVELS } from '../levels/index';
import { loadCosmetics, saveCosmetics, CosmeticsState, COLOR_DEFS, ACCESSORY_DEFS, CLOTH_DEFS } from '../cosmetics';
import { drawAccessoryOnGfx, drawClothOnGfx } from '../utils/draw-utils';

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
        
        const puppyX = width / 2 + 320;
        const puppyY = 125;
        const puppy = this.add.sprite(puppyX, puppyY, 'puppy_run').setScale(1.5);
        puppy.play('menu_idle');

        let menuAccGfx: Phaser.GameObjects.Graphics | undefined;
        let menuClothGfx: Phaser.GameObjects.Graphics | undefined;

        const applyToMenuPuppy = (s: CosmeticsState) => {
            const cd = COLOR_DEFS.find(c => c.id === s.selectedColor);
            if (cd?.tint != null) puppy.setTint(cd.tint); else puppy.clearTint();

            menuAccGfx?.destroy(); menuAccGfx = undefined;
            if (s.selectedAccessory !== 'none') {
                menuAccGfx = this.add.graphics();
                drawAccessoryOnGfx(menuAccGfx, s.selectedAccessory);
                menuAccGfx.setPosition(puppyX, puppyY - 40);
            }

            menuClothGfx?.destroy(); menuClothGfx = undefined;
            if (s.selectedCloth !== 'none') {
                menuClothGfx = this.add.graphics();
                drawClothOnGfx(menuClothGfx, s.selectedCloth);
                menuClothGfx.setPosition(puppyX, puppyY + 5);
            }
        };

        let menuState = loadCosmetics();
        applyToMenuPuppy(menuState);

        const wardrobeBtn = this.add.text(puppyX, puppyY + 65, '🎨 Wardrobe', {
            fontSize: '16px', color: '#33691e', backgroundColor: '#b2ff59', padding: { x: 10, y: 6 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        wardrobeBtn.on('pointerover', () => wardrobeBtn.setBackgroundColor('#33691e').setColor('#b2ff59'));
        wardrobeBtn.on('pointerout', () => wardrobeBtn.setBackgroundColor('#b2ff59').setColor('#33691e'));
        wardrobeBtn.on('pointerdown', () => {
            menuState = loadCosmetics();
            this.showWardrobePanel(menuState, (s) => { menuState = s; applyToMenuPuppy(s); });
        });

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

    private showWardrobePanel(state: CosmeticsState, onSave: (s: CosmeticsState) => void): void {
        const { width: W, height: H } = this.scale;
        const mutableState: CosmeticsState = {
            ...state,
            unlockedColors: [...state.unlockedColors],
            unlockedAccessories: [...state.unlockedAccessories],
            unlockedClothes: [...state.unlockedClothes],
        };
        const panelW = 580, panelH = 400;

        const overlay = this.add.rectangle(0, 0, W, H, 0x000000, 0.65).setOrigin(0).setDepth(300).setInteractive();

        const items: Phaser.GameObjects.GameObject[] = [];
        items.push(this.add.rectangle(0, 0, panelW, panelH, 0x0d1b2a, 0.97).setStrokeStyle(3, 0x33691e, 1));
        items.push(this.add.text(0, -panelH / 2 + 28, '🐾 Puppy Wardrobe', { fontSize: '22px', fontStyle: 'bold', color: '#b2ff59' }).setOrigin(0.5));

        const makeDivider = (y: number) => {
            const g = this.add.graphics().lineStyle(1, 0x33691e, 0.4).lineBetween(-panelW / 2 + 20, y, panelW / 2 - 20, y);
            items.push(g);
        };

        // ── Colors ──────────────────────────────────────────────────────
        const colorsUnlocked = mutableState.unlockedColors.length > 1;
        makeDivider(-150);
        items.push(this.add.text(-panelW / 2 + 20, -143, '🎨 Color', { fontSize: '15px', fontStyle: 'bold', color: colorsUnlocked ? '#FFD700' : '#888888' }));
        if (colorsUnlocked) {
            const defs = COLOR_DEFS.filter(c => mutableState.unlockedColors.includes(c.id));
            const rings: Phaser.GameObjects.Arc[] = [];
            defs.forEach((def, i) => {
                const ox = -(defs.length * 56) / 2 + 28 + i * 56, oy = -108;
                const ring = this.add.circle(ox, oy, 27, 0, 0).setStrokeStyle(3, 0xFFD700, mutableState.selectedColor === def.id ? 1 : 0);
                const sw = this.add.circle(ox, oy, 22, def.swatch).setInteractive({ useHandCursor: true });
                const lbl = this.add.text(ox, oy + 33, def.label, { fontSize: '10px', color: '#cccccc' }).setOrigin(0.5);
                rings.push(ring); items.push(ring, sw, lbl);
                sw.on('pointerdown', () => {
                    rings.forEach(r => r.setStrokeStyle(3, 0xFFD700, 0)); ring.setStrokeStyle(3, 0xFFD700, 1);
                    mutableState.selectedColor = def.id; saveCosmetics(mutableState); onSave(mutableState);
                });
            });
        } else {
            items.push(this.add.text(0, -112, '🔒  Complete Level 1 to unlock colors', { fontSize: '14px', color: '#666677' }).setOrigin(0.5));
        }

        // ── Accessories ──────────────────────────────────────────────────
        const accsUnlocked = mutableState.unlockedAccessories.length > 1;
        makeDivider(-70);
        items.push(this.add.text(-panelW / 2 + 20, -63, '🎀 Accessory', { fontSize: '15px', fontStyle: 'bold', color: accsUnlocked ? '#FFD700' : '#888888' }));
        if (accsUnlocked) {
            const defs = ACCESSORY_DEFS.filter(a => mutableState.unlockedAccessories.includes(a.id));
            const btnW = Math.min(138, Math.floor((panelW - 40) / defs.length) - 8);
            const spacing = btnW + 8;
            const btns: Phaser.GameObjects.Rectangle[] = [];
            defs.forEach((def, i) => {
                const ox = -(defs.length * spacing) / 2 + spacing / 2 + i * spacing, oy = -25;
                const sel = mutableState.selectedAccessory === def.id;
                const btn = this.add.rectangle(ox, oy, btnW, 40, def.id === 'none' ? 0x34495e : def.color, 0.85).setStrokeStyle(sel ? 3 : 1, 0xFFD700, sel ? 1 : 0.3).setInteractive({ useHandCursor: true });
                const lbl = this.add.text(ox, oy, def.label, { fontSize: '13px', fontStyle: 'bold', color: '#fff', stroke: '#000', strokeThickness: 2 }).setOrigin(0.5);
                btns.push(btn); items.push(btn, lbl);
                btn.on('pointerdown', () => {
                    btns.forEach(b => b.setStrokeStyle(1, 0xFFD700, 0.3)); btn.setStrokeStyle(3, 0xFFD700, 1);
                    mutableState.selectedAccessory = def.id; saveCosmetics(mutableState); onSave(mutableState);
                });
            });
        } else {
            items.push(this.add.text(0, -29, '🔒  Complete Level 2 to unlock accessories', { fontSize: '14px', color: '#666677' }).setOrigin(0.5));
        }

        // ── Clothes ──────────────────────────────────────────────────────
        const clothsUnlocked = mutableState.unlockedClothes.length > 1;
        makeDivider(13);
        items.push(this.add.text(-panelW / 2 + 20, 20, '👔 Outfit', { fontSize: '15px', fontStyle: 'bold', color: clothsUnlocked ? '#FFD700' : '#888888' }));
        if (clothsUnlocked) {
            const defs = CLOTH_DEFS.filter(c => mutableState.unlockedClothes.includes(c.id));
            const btnW = Math.min(138, Math.floor((panelW - 40) / defs.length) - 8);
            const spacing = btnW + 8;
            const btns: Phaser.GameObjects.Rectangle[] = [];
            defs.forEach((def, i) => {
                const ox = -(defs.length * spacing) / 2 + spacing / 2 + i * spacing, oy = 62;
                const sel = mutableState.selectedCloth === def.id;
                const btn = this.add.rectangle(ox, oy, btnW, 40, def.id === 'none' ? 0x34495e : def.color, 0.85).setStrokeStyle(sel ? 3 : 1, 0xFFD700, sel ? 1 : 0.3).setInteractive({ useHandCursor: true });
                const lbl = this.add.text(ox, oy, def.label, { fontSize: '13px', fontStyle: 'bold', color: '#fff', stroke: '#000', strokeThickness: 2 }).setOrigin(0.5);
                btns.push(btn); items.push(btn, lbl);
                btn.on('pointerdown', () => {
                    btns.forEach(b => b.setStrokeStyle(1, 0xFFD700, 0.3)); btn.setStrokeStyle(3, 0xFFD700, 1);
                    mutableState.selectedCloth = def.id; saveCosmetics(mutableState); onSave(mutableState);
                });
            });
        } else {
            items.push(this.add.text(0, 58, '🔒  Complete Level 3 to unlock outfits', { fontSize: '14px', color: '#666677' }).setOrigin(0.5));
        }

        // ── Done button ──────────────────────────────────────────────────
        const doneBtn = this.add.rectangle(0, panelH / 2 - 36, 160, 40, 0x33691e).setStrokeStyle(2, 0xb2ff59, 0.8).setInteractive({ useHandCursor: true });
        const doneTxt = this.add.text(0, panelH / 2 - 36, '✓ Close', { fontSize: '16px', fontStyle: 'bold', color: '#b2ff59' }).setOrigin(0.5);
        items.push(doneBtn, doneTxt);

        let panel: Phaser.GameObjects.Container;
        doneBtn.on('pointerdown', () => { overlay.destroy(); panel.destroy(); });
        panel = this.add.container(W / 2, H / 2, items).setDepth(301).setAlpha(0);
        this.tweens.add({ targets: panel, alpha: 1, duration: 300, ease: 'Power2' });
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