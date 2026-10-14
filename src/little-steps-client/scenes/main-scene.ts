import Phaser from 'phaser';
import { LEVELS } from '../levels/index';
import { applyEffects, ResourceVector, ResourceEffect, NodeType, LevelData, GraphNode } from '../levels/level-data';
import { computeEnergyGame, EnergyGameResult, buildCatChaseGraph } from '../engine/energy-game-engine';
import { createDefenderTrapIcon } from '../utils/draw-utils';
import { loadCosmetics } from '../cosmetics';
import { MistLayer } from '../utils/mist-layer';
import { drawPixelPanel, PIXEL_FONT, PANEL_TEXT, makePixelButton, drawResourceIcon } from '../utils/pixel-panel';
import { isLevelUnlocked, completeLevel } from '../progress';
import { applyPuppyPalette } from '../utils/puppy-palette';

export class MainScene extends Phaser.Scene {
    // --- Core Game Data ---
    private level!: LevelData;
    private graph!: GraphNode[];
    private currentNodeId = 0;
    private catNodeId?: number;
    private levelIndex = 0;

    // --- Game Objects ---
    private puppy!: Phaser.GameObjects.Sprite;
    private catSprite?: Phaser.GameObjects.Sprite;
    private squirrel?: Phaser.GameObjects.Sprite;
    private accessoryGfx?: Phaser.GameObjects.Graphics;
    private clothGfx?: Phaser.GameObjects.Graphics;
    
    // --- UI Elements ---
    private tooltipContainer!: Phaser.GameObjects.Container;
    private tooltipBg!: Phaser.GameObjects.Graphics;
    private tooltipText!: Phaser.GameObjects.Text;
    private mist?: MistLayer;

    // --- State Flags ---
    private isMoving = false;
    private isGameOver = false;
    private isFogOfWar = false;
    private isTutorialActive = false;
    private isCatMoving = false;
    private skipCatMoveOnce = false;
    private previousDogNodeId = 0;
    private dogTrail: number[] = [];

    // --- Tracking Collections ---
    private revealedNodes = new Set<number>();
    private triggeredTraps = new Set<number>();
    
    // --- Visual Asset Maps ---
    private nodeGraphicsMap = new Map<number, Phaser.GameObjects.Arc | Phaser.GameObjects.Container>();
    private nodeTextsMap = new Map<number, Phaser.GameObjects.Text>();
    private edgeGraphicsMap = new Map<string, Phaser.GameObjects.Graphics>();
    private edgeTextsMap = new Map<string, Phaser.GameObjects.Container>();
    private nodeEffectTextsMap = new Map<number, Phaser.GameObjects.Container>();

    // --- Resource & Logic ---
    private currentResources!: ResourceVector;
    private energyGameResult!: EnergyGameResult;
    private activeHints: Phaser.GameObjects.GameObject[] = [];
    private tutorialDialogues = new Map<number, string>();

    constructor() { super('MainScene'); }

    /**
     * Initializes scene data, state flags, and game logic engine
     */
    init(data: { levelIndex: number }): void {
        this.levelIndex = isLevelUnlocked(data.levelIndex ?? 0) ? (data.levelIndex ?? 0) : 0;
        this.level = LEVELS[this.levelIndex];

        // Deep-copy nodes so we can add reverse edges without mutating level data
        this.graph = this.level.nodes.map(n => ({ ...n, neighbors: [...n.neighbors] }));
        const nodeById = new Map(this.graph.map(n => [n.id, n]));
        for (const node of this.graph) {
            for (const edge of [...node.neighbors]) {
                const target = nodeById.get(edge.targetId);
                if (target && !target.neighbors.some(e => e.targetId === node.id)) {
                    target.neighbors.push({
                        targetId: node.id,
                        effects: edge.effects?.map(eff => ({ ...eff })),
                        pathNodes: edge.pathNodes ? [...edge.pathNodes].reverse() : undefined
                    });
                }
            }
        }

        this.currentNodeId = this.level.startNodeId;
        
        // Reset all state flags
        this.isMoving = this.isGameOver = this.isCatMoving = this.isTutorialActive = this.skipCatMoveOnce = false;
        this.previousDogNodeId = this.level.startNodeId;
        this.dogTrail = [this.level.startNodeId];
        this.catNodeId = this.catSprite = this.squirrel = undefined;
        this.accessoryGfx = this.clothGfx = undefined;
        this.isFogOfWar = this.levelIndex > 1;
        this.mist = undefined;

        // Tutorial step dialogues (levelIndex 0 only)
        this.tutorialDialogues.clear();
        if (this.levelIndex === 0) {
            this.tutorialDialogues.set(1, 'You moved! 🐾\nNotice the HUD at the top — Time and Stamina both decreased.\nEvery step has a cost. Plan your route wisely!');
            this.tutorialDialogues.set(2, 'You found a Bone! 🦴\nThe goal gate is locked — you need at least one bone before you can enter.\nHead back on track and reach the House!');
        }

        // Compute optimal paths using the engine
        const playableLevel = { ...this.level, nodes: this.graph };
        const graphForEngine = this.level.catStartNodeId !== undefined ? buildCatChaseGraph(playableLevel) : playableLevel;
        this.energyGameResult = computeEnergyGame(graphForEngine);

        // Clear all tracking maps/sets for level restart
        [this.revealedNodes, this.triggeredTraps].forEach(s => s.clear());
        [this.nodeGraphicsMap, this.nodeTextsMap, this.edgeGraphicsMap, this.edgeTextsMap, this.nodeEffectTextsMap].forEach(m => m.clear());
    }

    /**
     * Loads external graphical assets
     */
    preload(): void {
        // Player and common assets
        this.load.spritesheet('puppy_run', 'assets/Splayer_strip4.png', { frameWidth: 64, frameHeight: 64 });
        this.load.spritesheet('squirrel_img', 'assets/squirrel.png', { frameWidth: 50, frameHeight: 45 });
        this.load.image('town_tiles', 'assets/tilemap_packed.png');
        const mapKey = `map${this.levelIndex}`;
        if (this.cache.tilemap.exists(mapKey)) this.cache.tilemap.remove(mapKey);
        this.load.tilemapTiledJSON(mapKey, `assets/map${this.levelIndex}.json`);
        this.load.image('heart', 'assets/heart.png');
        this.load.image('fire', 'assets/fire.png');
        
        // Dynamic check for Level 3 (levelIndex 2) to load the new 8-frame cat asset
        if (this.levelIndex === 3) {
            // Note: Assuming the cat image width is divided by 8 frames perfectly. 
            // If the cat looks weird, you might need to adjust 32x32 to your exact pixel size.
            this.load.spritesheet('real_cat', 'assets/cat.png', { frameWidth: 65, frameHeight: 43 });
        }
    }

    /**
     * Helper to safely play animations on a sprite if it exists
     */
    private safePlay(sprite: Phaser.GameObjects.Sprite | null | undefined, key: string): void {
        if (sprite === this.puppy && (key === 'walk' || key === 'idle')) key = `puppy-${key}-${sprite.getData('look') ?? 'default-none-none'}`;
        if (sprite && this.anims.exists(key) && this.anims.get(key)!.frames.length > 0) sprite.play(key, true);
    }

    /**
     * Main setup method: builds map, characters, UI, and starts gameplay
     */
    create(): void {
        this.createBoneTexture();
        this.createClockTexture();
        
        // Setup tilemap background
        const map = this.make.tilemap({ key: `map${this.levelIndex}` });
        const tileset = map.addTilesetImage('town_tiles', 'town_tiles');
        if (tileset) {
            ['background', 'midground', 'foreground'].forEach(layer => map.createLayer(layer, tileset, 0, 0)?.setScale(2.5));
        }

        this.make.graphics({ x: 0, y: 0 }).fillStyle(0xffffff, 1).fillCircle(4, 4, 4).generateTexture('white_dot', 8, 8).destroy();

        // Initialize resources
        this.currentResources = { ...this.level.initialResources };
        this.graph.forEach(node => this.registry.remove(`bone_${node.id}`));
        Object.entries({ resources: this.currentResources, preview: null, goalReached: false, node: this.currentNodeId, energyGameResult: this.energyGameResult, initialResources: { ...this.level.initialResources }, nodeType: this.graph.find(n => n.id === this.currentNodeId)!.type, levelIndex: this.levelIndex }).forEach(([k, v]) => this.registry.set(k, v));

        this.scene.launch('HudScene');
        this.drawGraph();

        if (this.isFogOfWar) {
            [this.nodeGraphicsMap, this.nodeTextsMap, this.edgeGraphicsMap, this.edgeTextsMap, this.nodeEffectTextsMap].forEach(m => m.forEach(o => o.setAlpha(0)));
            
            this.mist = new MistLayer(this, this.scale.width, this.scale.height);

            this.revealNode(this.currentNodeId, false);
            this.revealEdgesFrom(this.currentNodeId, false);
        }

        // Setup Player
        const start = this.graph.find(n => n.id === this.currentNodeId)!;
        this.puppy = this.add.sprite(start.x, start.y, 'puppy_run').setScale(1.5).setDepth(10).setOrigin(0.5, 0.9);
        this.applyCosmetics();

        // Player & Squirrel Animations
        const puppyFrames = this.anims.generateFrameNumbers('puppy_run', { start: 0, end: 3 });
        if (puppyFrames.length > 0) {
            if (!this.anims.exists('walk')) this.anims.create({ key: 'walk', frames: puppyFrames, frameRate: 9, repeat: -1 });
            if (!this.anims.exists('idle')) this.anims.create({ key: 'idle', frames: [{ key: 'puppy_run', frame: 0 }], frameRate: 10 });
        }
        
        const sqFrames = this.anims.generateFrameNumbers('squirrel_img', { frames: [0, 1] });
        if (sqFrames.length > 0) {
            if (!this.anims.exists('squirrel_run')) this.anims.create({ key: 'squirrel_run', frames: sqFrames, frameRate: 8, repeat: -1 });
            if (!this.anims.exists('squirrel_idle')) this.anims.create({ key: 'squirrel_idle', frames: [{ key: 'squirrel_img', frame: 0 }], frameRate: 10 });
        }

        // Setup specific animations for the new Cat (Level 3 only)
        if (this.levelIndex === 3) {
            if (!this.anims.exists('cat_walk')) {
                this.anims.create({ 
                    key: 'cat_walk', 
                    frames: this.anims.generateFrameNumbers('real_cat', { start: 0, end: 7 }), 
                    frameRate: 12, // Slightly faster frame rate for the cat
                    repeat: -1 
                });
            }
        }

        // Setup Enemy Character
        if (this.level.catStartNodeId !== undefined) {
            this.catNodeId = this.level.catStartNodeId;
            const catNode = this.graph.find(n => n.id === this.catNodeId)!;
            
            // Level 3: Use new cat sprite. Other levels: Fallback to red tinted puppy.
            if (this.levelIndex === 3) {
                this.catSprite = this.add.sprite(catNode.x, catNode.y, 'real_cat')
                    .setScale(2)
                    .setDepth(11)
                    .setOrigin(0.5, 0.9); // No red tint needed for the actual cat
            } else {
                this.catSprite = this.add.sprite(catNode.x, catNode.y, 'puppy_run')
                    .setScale(1.5)
                    .setDepth(11)
                    .setOrigin(0.5, 0.9)
                    .setTint(0xff5555);
            }
        }

        // Tooltip Setup
        this.tooltipContainer = this.add.container(0, 0).setDepth(1500).setAlpha(0);
        this.tooltipBg = this.add.graphics();
        drawPixelPanel(this.tooltipBg, 240, 80);
        this.tooltipText = this.add.text(0, 0, '', { fontFamily: PIXEL_FONT, fontSize: '14px', fontStyle: 'bold', color: PANEL_TEXT, align: 'center', lineSpacing: 5, wordWrap: { width: 240 } }).setOrigin(0.5);
        this.tooltipContainer.add([this.tooltipBg, this.tooltipText]);

        this.highlightPossibleMoves();

        // Tutorial Dialogues
        const tutorials = [
            'Ivory corners and a small arrow mark each available stop.\nClick one of these stops to move.',
            'Every move costs Time and Stamina — plan your route carefully!',
            'The map is covered in fog!\nNew paths reveal themselves as you explore.',
            'Watch out! A mischievous cat is on the prowl.\nKeep moving and do not let it catch you!'
        ];

        this.isTutorialActive = true;
        this.showLevelIntro(() => {
            if (tutorials[this.levelIndex]) {
                this.showDialogue(tutorials[this.levelIndex], () => { this.isTutorialActive = false; });
            } else {
                this.isTutorialActive = false;
            }
        });
        }
    private getTooltipText(node: GraphNode, isNeighbor: boolean): string {
        if (node.type === NodeType.DEFENDER && !this.triggeredTraps.has(node.id)) {
            return '🐿️ Squirrel Node:\nThe squirrel picks the hardest path for you!';
        }
        if (node.nodeEffects?.some(e => e.resource === 'bones' && e.value > 0)) {
            return 'Bone Node:\nCollect to increase score.';
        }
        if (this.levelIndex === 0 && isNeighbor) {
            return 'Walkable Path:\nClick to move here.';
        }
        return '';
    }


    private showDialogue(text: string, onComplete: () => void, nearPuppy = false): void {
        this.tweens.killTweensOf(this.tooltipContainer);
        this.tooltipContainer.setAlpha(0);
        this.registry.set('preview', null);
        const { width, height } = this.scale;
        const blocker = this.add.rectangle(0, 0, width, height, 0x000000, 0).setName('dialogue-blocker').setOrigin(0).setDepth(3000).setInteractive({ useHandCursor: true });
        const container = this.add.container(width / 2, height + 200).setName('tutorial-dialogue').setDepth(3001);

        const msg = this.add.text(0, 0, text, { fontFamily: PIXEL_FONT, fontSize: '14px', color: PANEL_TEXT, fontStyle: 'bold', align: 'center', lineSpacing: 5, wordWrap: { width: nearPuppy ? 330 : 510 } }).setOrigin(0.5);
        const hint = this.add.text(0, 0, 'click to continue', { fontFamily: PIXEL_FONT, fontSize: '13px', color: '#77583E' }).setOrigin(0.5);

        const gap = 16;
        const totalH = msg.height + gap + hint.height;
        const pad = 20;
        const bgH = totalH + pad * 2;

        msg.setY(-hint.height / 2 - gap / 2);
        hint.setY(msg.y + msg.height / 2 + gap + hint.height / 2);

        const bg = this.add.graphics();
        const cardW = nearPuppy ? 380 : 550;
        drawPixelPanel(bg, cardW, bgH);
        container.add([bg, msg, hint]);
        const targetY = nearPuppy
            ? Phaser.Math.Clamp(this.puppy.y - 110 - bgH / 2, 86 + bgH / 2, height - bgH / 2 - 12)
            : (this.puppy.y > height - bgH - 112 ? 94 + bgH / 2 : height - bgH / 2 - 12);
        if (nearPuppy) container.setPosition(Phaser.Math.Clamp(this.puppy.x, cardW / 2 + 12, width - cardW / 2 - 12), targetY + 8).setAlpha(0);

        this.tweens.add({ targets: container, y: targetY, alpha: 1, duration: 260, ease: 'Sine.easeOut', onComplete: () => {
            blocker.once('pointerdown', () => {
                blocker.destroy();
                this.tweens.add({ targets: container, y: nearPuppy ? targetY - 8 : height + 200, alpha: 0, duration: nearPuppy ? 180 : 300, ease: 'Power2', onComplete: () => { container.destroy(); onComplete(); }});
            });
        }});
    }

    private createBoneTexture() {
        if (this.textures.exists('bone_icon')) return;
        this.make.graphics({ x: 0, y: 0 }).fillStyle(0xffffff, 1).fillRoundedRect(4, 4, 16, 6, 2).fillCircle(4, 7, 4).fillCircle(4, 11, 4).fillCircle(20, 7, 4).fillCircle(20, 11, 4).generateTexture('bone_icon', 24, 14).destroy();
    }

    private createClockTexture() {
        if (this.textures.exists('clock')) return;
        const g = this.make.graphics({ x: 0, y: 0 });
        drawResourceIcon(g, 'time', 9, 9);
        g.generateTexture('clock', 18, 18); g.destroy();
    }

    private showSweatAnimation(x: number, y: number): void {
        [
            { ox: -14, oy:  0, delay:   0, w: 9,  h: 13 },
            { ox:  12, oy: -5, delay: 100, w: 11, h: 15 },
            { ox:  -3, oy: -8, delay: 200, w: 8,  h: 11 },
            { ox:  18, oy:  2, delay:  60, w: 10, h: 14 },
            { ox: -10, oy: -3, delay: 300, w: 7,  h: 10 },
        ].forEach(({ ox, oy, delay, w, h }) => {
            const drop = this.add.graphics().setDepth(200);
            drop.fillStyle(0x4fc3f7, 1);
            drop.fillEllipse(0, 0, w, h);
            drop.setPosition(x + ox, y + oy);
            this.tweens.add({ targets: drop, y: drop.y - 55, x: drop.x + (ox > 0 ? 6 : -6), alpha: 0, delay, duration: 700, ease: 'Power1', onComplete: () => drop.destroy() });
        });
    }

    private showHappyAnimation(x: number, y: number): void {
        const excl = this.add.text(x, y - 15, '!', { fontSize: '36px', fontStyle: 'bold', color: '#ffd700', stroke: '#000000', strokeThickness: 4 }).setOrigin(0.5).setDepth(200).setScale(0);
        this.tweens.add({ targets: excl, scale: 1.6, duration: 220, ease: 'Back.easeOut', onComplete: () =>
            this.tweens.add({ targets: excl, y: excl.y - 50, alpha: 0, delay: 250, duration: 450, onComplete: () => excl.destroy() })
        });
        const e1 = this.add.particles(x, y, 'white_dot', { speed: { min: 60, max: 140 }, angle: { min: 0, max: 360 }, gravityY: -30, scale: { start: 1.5, end: 0 }, alpha: { start: 1, end: 0 }, lifespan: 900, frequency: 12, quantity: 3, tint: 0xffd700, blendMode: 'ADD' }).setDepth(200);
        this.time.delayedCall(150, () => e1.stop());
        this.time.delayedCall(1100, () => e1.destroy());
        this.time.delayedCall(150, () => {
            const e2 = this.add.particles(x, y, 'white_dot', { speed: { min: 50, max: 110 }, angle: { min: 0, max: 360 }, gravityY: -20, scale: { start: 1.0, end: 0 }, alpha: { start: 0.8, end: 0 }, lifespan: 700, frequency: 12, quantity: 3, tint: 0xffffff, blendMode: 'ADD' }).setDepth(200);
            this.time.delayedCall(150, () => e2.stop());
            this.time.delayedCall(900, () => e2.destroy());
        });
    }

    public applyCosmetics(): void {
        if (!this.puppy) return;
        const state = loadCosmetics();
        this.accessoryGfx?.destroy(); this.clothGfx?.destroy();
        this.accessoryGfx = this.clothGfx = undefined;
        applyPuppyPalette(this, this.puppy, state.selectedColor, state.selectedAccessory, state.selectedCloth);
    }

    update(): void {
        if (!this.puppy?.active) return;
        const puppyBounds = new Phaser.Geom.Rectangle(this.puppy.x - 36, this.puppy.y - 96, 72, 110);
        if (this.tooltipContainer?.alpha > 0 && Phaser.Geom.Intersects.RectangleToRectangle(puppyBounds, this.tooltipContainer.getBounds())) {
            this.tweens.killTweensOf(this.tooltipContainer);
            this.tooltipContainer.setAlpha(0);
        }
        for (const badge of new Set([...this.edgeTextsMap.values(), ...this.nodeEffectTextsMap.values()])) {
            const box = new Phaser.Geom.Rectangle(badge.x - badge.width / 2 - 4, badge.y - 14, badge.width + 8, 28);
            badge.setVisible(!Phaser.Geom.Intersects.RectangleToRectangle(puppyBounds, box));
        }
        if (this.accessoryGfx?.active) this.accessoryGfx.setPosition(this.puppy.x, this.puppy.y - 78);
        if (this.clothGfx?.active) this.clothGfx.setPosition(this.puppy.x, this.puppy.y - 35);
    }

    private createUnavailableMarker(x: number, y: number): Phaser.GameObjects.Graphics {
        const g = this.add.graphics().setPosition(x, y).setDepth(41);
        // A quiet trail lock replaces the large red ring; the stop stays visible.
        g.fillStyle(0x685c49, 0.72).fillRect(-6, -3, 12, 10);
        g.lineStyle(2, 0x685c49, 0.72).strokeRect(-4, -9, 8, 7);
        g.fillStyle(0xd9cdb2).fillRect(-4, -1, 8, 6);
        g.fillStyle(0x685c49).fillRect(-1, 0, 2, 3);
        return g;
    }

    private createMoveMarker(x: number, y: number): Phaser.GameObjects.Container {
        const ring = this.add.graphics();
        ring.fillStyle(0x496c47, 0.16).fillRect(-24, -17, 48, 34);
        ring.lineStyle(3, 0xf5eed2, 1);
        for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
            ring.beginPath().moveTo(sx * 24, sy * 9).lineTo(sx * 24, sy * 17).lineTo(sx * 16, sy * 17).strokePath();
        }
        const arrow = this.add.graphics();
        arrow.fillStyle(0x4a663e).fillRect(-5, -37, 10, 5).fillRect(-3, -32, 6, 3).fillRect(-1, -29, 2, 2);
        arrow.fillStyle(0xf5eed2).fillRect(-3, -36, 6, 3);
        const marker = this.add.container(x, y, [ring, arrow]).setDepth(41);
        const pulse = this.tweens.add({ targets: arrow, y: -4, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        marker.once('destroy', () => pulse.stop());
        return marker;
    }

    private revealNode(nodeId: number, animate: boolean): void {
        if (this.revealedNodes.has(nodeId)) return;
        this.revealedNodes.add(nodeId);
        
        const targets = [this.nodeGraphicsMap.get(nodeId), this.nodeTextsMap.get(nodeId), this.nodeEffectTextsMap.get(nodeId)].filter((target): target is Phaser.GameObjects.Arc | Phaser.GameObjects.Container | Phaser.GameObjects.Text => target !== undefined);
        if (targets.length) animate ? this.tweens.add({ targets, alpha: 1, duration: 600 }) : targets.forEach(t => t.setAlpha(1));

        const node = this.graph.find(n => n.id === nodeId);
        if (node) this.mist?.reveal(nodeId, node.x, node.y, animate);
    }

    private revealEdgesFrom(nodeId: number, animate: boolean): void {
        const source = this.graph.find(n => n.id === nodeId);
        source?.neighbors.forEach(edge => {
            const target = this.graph.find(n => n.id === edge.targetId)!;
            this.mist?.revealPath(nodeId, target.id, this.getMovementPath(source, target, edge.pathNodes), animate);
            const graphic = this.edgeGraphicsMap.get(`${nodeId}-${edge.targetId}`);
            if (graphic && graphic.alpha === 0) {
                animate ? this.tweens.add({ targets: graphic, alpha: 1, duration: 600 }) : graphic.setAlpha(1);
            }
            this.revealNode(edge.targetId, animate);
        });
    }

    /**
     * Generates visual labels for resource gains/costs on paths or nodes.
     * Uses setTintFill to force icons to turn completely green upon deduction.
     */
    private createEffectBars(x: number, y: number, effects: ResourceEffect[] | undefined) {
        if (!effects?.length) return null;
        const cells = effects.map(eff => {
            const prefix = eff.op === 'add' ? (eff.value >= 0 ? '+' : '-') : eff.op === 'set' ? '=' : '<';
            return { eff, label: `${prefix}${Math.abs(eff.value)}` };
        });
        const widths = cells.map(c => 20 + c.label.length * 7);
        const width = widths.reduce((a, b) => a + b, 0) + 8;
        const container = this.add.container(x, y).setDepth(42).setSize(width, 20);
        const g = this.add.graphics();
        g.fillStyle(0x49382c, 0.16).fillRect(-width / 2 + 1, -8, width, 20);
        g.fillStyle(0x795b40, 0.65).fillRect(-width / 2, -10, width, 20);
        g.fillStyle(0xe2e3de, 0.93).fillRect(-width / 2 + 1, -9, width - 2, 18);
        container.add(g);
        let cursor = -width / 2 + 4;
        cells.forEach(({ eff, label }, i) => {
            drawResourceIcon(g, eff.resource, cursor + 7, 0);
            container.add(this.add.text(cursor + 17, 0, label, {
                fontFamily: PIXEL_FONT, fontSize: '11px', fontStyle: 'bold',
                color: eff.value > 0 ? '#4A6842' : PANEL_TEXT,
            }).setOrigin(0, 0.5));
            cursor += widths[i];
        });
        return container;
    }

    /** Place badges outside every character-sized map stop, then avoid the moving puppy. */
    private arrangeMapBadges(): void {
        const placed: Phaser.Geom.Rectangle[] = [];
        const badges = [...new Set([...this.nodeEffectTextsMap.values(), ...this.edgeTextsMap.values()])];
        const occupied = this.graph.map(n => new Phaser.Geom.Rectangle(n.x - 33, n.y - 94, 66, 106));
        occupied.push(new Phaser.Geom.Rectangle(8, 8, 310, 72));
        badges.forEach(badge => {
            const homeX = badge.x, homeY = badge.y;
            const offsets = [[0, 0], [0, -28], [0, 28], [-60, 0], [60, 0], [0, -56], [0, 56], [-90, -28], [90, -28]];
            for (const [dx, dy] of offsets) {
                const box = new Phaser.Geom.Rectangle(homeX + dx - badge.width / 2 - 4, homeY + dy - 14, badge.width + 8, 28);
                if (box.x < 8 || box.right > this.scale.width - 8 || box.y < 8 || box.bottom > this.scale.height - 8) continue;
                if ([...occupied, ...placed].some(r => Phaser.Geom.Intersects.RectangleToRectangle(r, box))) continue;
                badge.setPosition(homeX + dx, homeY + dy);
                placed.push(box);
                return;
            }
            // Leave an unplaceable badge available without ever covering the puppy.
            badge.setData('avoidPuppy', true);
        });
    }

    private getMovementPath(source: { x: number; y: number }, target: { x: number; y: number }, points?: { x: number; y: number }[]): { x: number; y: number }[] {
        return [{ x: source.x, y: source.y }, ...(points?.slice(1, -1) ?? []), { x: target.x, y: target.y }];
    }

    private moveToNextNode(targetNodeId: number, isTrapTrigger = false): void {
        if (this.isMoving || this.isGameOver || this.isCatMoving || this.isTutorialActive) return;
        const edge = this.graph.find(n => n.id === this.currentNodeId)?.neighbors.find(e => e.targetId === targetNodeId);
        if (!edge) return;
        
        const nextResources = applyEffects(this.currentResources, edge.effects, this.level.maxResources);
        if (nextResources.time < 0 || nextResources.stamina < 0) return this.triggerDefeat(nextResources.time < 0 ? 'time' : 'stamina');

        this.activeHints.forEach(h => h?.destroy());
        this.activeHints = [];
        this.tweens.killTweensOf(this.tooltipContainer);
        this.tooltipContainer.setAlpha(0);
        this.registry.set('preview', null);
        if (nextResources.stamina < this.currentResources.stamina) this.showSweatAnimation(this.puppy.x, this.puppy.y - 30);
        this.isMoving = true;
        this.registry.set('resources', this.currentResources = nextResources);

        const targetNode = this.graph.find(n => n.id === targetNodeId)!;
        const triggerChase = isTrapTrigger || edge.isChase;

        const movementPath = this.getMovementPath(this.puppy, targetNode, edge.pathNodes);
        if (edge.pathNodes?.length) {
            if (triggerChase) {
                this.squirrel = this.add.sprite(this.puppy.x, this.puppy.y, 'squirrel_img').setScale(1.5).setDepth(10).setOrigin(0.5, 0.9);
                this.moveSquirrelStep(movementPath, 1, () => {});
                this.time.delayedCall(400, () => this.moveAlongPath(movementPath, targetNode, true));
            } else {
                this.moveAlongPath(movementPath, targetNode, false);
            }
        } else {
            if (triggerChase) {
                this.squirrel = this.add.sprite(this.puppy.x, this.puppy.y, 'squirrel_img').setScale(1.5).setDepth(10).setOrigin(0.5, 0.9);
                this.safePlay(this.squirrel.setFlipX(targetNode.x < this.squirrel.x), 'squirrel_run');
                this.tweens.add({ targets: this.squirrel, x: targetNode.x, y: targetNode.y, duration: Phaser.Math.Distance.Between(this.squirrel.x, this.squirrel.y, targetNode.x, targetNode.y) * 3.2, ease: 'Linear', onComplete: () => this.safePlay(this.squirrel, 'squirrel_idle') });
                this.time.delayedCall(200, () => {
                    this.safePlay(this.puppy.setFlipX(targetNode.x < this.puppy.x), 'walk');
                    this.tweens.add({ targets: this.puppy, x: targetNode.x, y: targetNode.y, duration: Phaser.Math.Distance.Between(this.puppy.x, this.puppy.y, targetNode.x, targetNode.y) * 4, ease: 'Linear', onComplete: () => { this.squirrel?.destroy(); this.handleMoveCompletion(targetNodeId, targetNode); } });
                });
            } else {
                this.safePlay(this.puppy.setFlipX(targetNode.x < this.puppy.x), 'walk');
                this.tweens.add({ targets: this.puppy, x: targetNode.x, y: targetNode.y, duration: Phaser.Math.Distance.Between(this.puppy.x, this.puppy.y, targetNode.x, targetNode.y) * 4, ease: 'Linear', onComplete: () => this.handleMoveCompletion(targetNodeId, targetNode) });
            }
        }
    }

    private moveSquirrelStep(path: { x: number, y: number }[], index: number, onComplete: () => void): void {
        if (!this.squirrel) return;
        if (index >= path.length) {
            this.safePlay(this.squirrel, 'squirrel_idle');
            return onComplete();
        }
        const pt = path[index];
        this.safePlay(this.squirrel.setFlipX(pt.x < this.squirrel.x), 'squirrel_run');
        this.tweens.add({ targets: this.squirrel, x: pt.x, y: pt.y, duration: Phaser.Math.Distance.Between(this.squirrel.x, this.squirrel.y, pt.x, pt.y) * 3.2, ease: 'Linear', onComplete: () => this.moveSquirrelStep(path, index + 1, onComplete) });
    }

    private moveAlongPath(path: { x: number, y: number }[], targetNode: GraphNode, isChase: boolean = false): void {
        const moveStep = (i: number) => {
            if (i >= path.length) {
                if (isChase) this.squirrel?.destroy();
                return this.handleMoveCompletion(targetNode.id, targetNode);
            }
            const pt = path[i], prev = i > 0 ? path[i - 1] : this.puppy;
            if (Math.abs(pt.x - prev.x) > 2) this.puppy.setFlipX(pt.x < prev.x);
            const dist = Phaser.Math.Distance.Between(this.puppy.x, this.puppy.y, pt.x, pt.y);
            dist < 2 ? moveStep(i + 1) : this.tweens.add({ targets: this.puppy, x: pt.x, y: pt.y, duration: dist * 4, ease: 'Linear', onComplete: () => moveStep(i + 1) });
        };
        this.safePlay(this.puppy, 'walk');
        moveStep(1);
    }

    private handleMoveCompletion(targetNodeId: number, targetNode: GraphNode): void {
        this.safePlay(this.puppy, 'idle');
        this.previousDogNodeId = this.currentNodeId;
        this.registry.set('node', this.currentNodeId = targetNodeId);
        this.dogTrail.push(targetNodeId);
        this.registry.set('nodeType', targetNode.type === NodeType.DEFENDER && this.triggeredTraps.has(targetNode.id) ? NodeType.PLAYER : targetNode.type);

        if (targetNode.nodeEffects?.length) {
            this.registry.set('resources', this.currentResources = applyEffects(this.currentResources, targetNode.nodeEffects, this.level.maxResources));
            if (targetNode.nodeEffects.some(e => e.resource === 'bones' && e.value > 0) && !this.registry.get(`bone_${targetNodeId}`)) {
                this.registry.set(`bone_${targetNodeId}`, true);
                const ui = this.nodeEffectTextsMap.get(targetNodeId);
                if (ui) this.tweens.add({ targets: ui, alpha: 0, duration: 300 });
                const b = this.add.image(this.puppy.x, this.puppy.y - 30, 'bone_icon').setScale(1.5).setDepth(200);
                this.tweens.add({ targets: b, x: this.cameras.main.scrollX + 430, y: this.cameras.main.scrollY + 60, scale: 2.5, rotation: Math.PI * 4, duration: 600, ease: 'Power2', onComplete: () => b.destroy() });
                this.showHappyAnimation(this.puppy.x, this.puppy.y - 20);
            }
        }
        if (this.isFogOfWar) this.revealEdgesFrom(targetNodeId, true);
        this.isMoving = false;

        if (this.currentResources.time < 0 || this.currentResources.stamina < 0) {
            return this.triggerDefeat(this.currentResources.time < 0 ? 'time' : 'stamina');
        }
        if (this.currentNodeId === this.catNodeId) return this.triggerDefeat('cat');

        if (this.currentNodeId === this.level.goalNodeId && this.currentResources.bones >= 1) {
            this.registry.set('finalResources', { ...this.currentResources });
            completeLevel(this.levelIndex);
            this.registry.set('goalReached', true);
            this.highlightPossibleMoves();
            this.triggerVictory();
        } else if (this.catNodeId !== undefined) {
            if (this.currentNodeId === this.catNodeId) {
                this.triggerDefeat('cat');
            } else if (this.skipCatMoveOnce) {
                this.skipCatMoveOnce = false;
                this.highlightPossibleMoves();
            } else {
                this.moveCat();
            }
        } else {
            const tutMsg = this.tutorialDialogues.get(targetNodeId);
            if (tutMsg) {
                this.isTutorialActive = true;
                this.showDialogue(tutMsg, () => { this.isTutorialActive = false; this.highlightPossibleMoves(); });
            } else {
                this.highlightPossibleMoves();
            }
        }
    }

    /**
     * Handles enemy movement logic and animation playback.
     * Greedy: moves to the neighbor node with minimum Euclidean distance to the player.
     */
    private moveCat(): void {
        if (this.catNodeId === undefined || !this.catSprite || this.isGameOver) return;

        const catNode = this.graph.find(n => n.id === this.catNodeId)!;
        let bestTarget = this.catNodeId;

        // Trail-following: find last occurrence of cat's node in dog's trail, move to the next node
        const lastIdx = this.dogTrail.lastIndexOf(this.catNodeId);
        if (lastIdx !== -1 && lastIdx + 1 < this.dogTrail.length) {
            const nextInTrail = this.dogTrail[lastIdx + 1];
            if (catNode.neighbors.some(e => e.targetId === nextInTrail)) {
                bestTarget = nextInTrail;
            }
        }

        // Fallback: cat's node not in trail yet — use Euclidean to previousDogNodeId
        if (bestTarget === this.catNodeId) {
            const fallbackTarget = this.graph.find(n => n.id === this.previousDogNodeId)
                ?? this.graph.find(n => n.id === this.currentNodeId)!;
            let bestDist = Infinity;
            for (const edge of catNode.neighbors) {
                const neighbor = this.graph.find(n => n.id === edge.targetId);
                if (!neighbor) continue;
                const dist = Phaser.Math.Distance.Between(neighbor.x, neighbor.y, fallbackTarget.x, fallbackTarget.y);
                if (dist < bestDist) { bestDist = dist; bestTarget = edge.targetId; }
            }
        }

        this.isCatMoving = true;
        const targetNode = this.graph.find(n => n.id === bestTarget)!;
        const animToPlay = this.levelIndex === 3 ? 'cat_walk' : 'walk';
        this.safePlay(this.catSprite.setFlipX(targetNode.x < this.catSprite.x), animToPlay);
        this.tweens.add({ targets: this.catSprite, x: targetNode.x, y: targetNode.y, duration: Phaser.Math.Clamp(Phaser.Math.Distance.Between(this.catSprite.x, this.catSprite.y, targetNode.x, targetNode.y) * 2.5, 220, 650), ease: 'Linear', onComplete: () => {
            this.catSprite?.stop();
            this.catNodeId = bestTarget;
            this.isCatMoving = false;
            this.catNodeId === this.currentNodeId ? this.triggerDefeat('cat') : this.highlightPossibleMoves();
        }});
    }

    private triggerVictory(): void {
        this.tweens.killTweensOf(this.tooltipContainer);
        this.tooltipContainer.setAlpha(0);
        this.registry.set('preview', null);
        this.isGameOver = true;
        this.tweens.add({ targets: this.puppy, y: this.puppy.y - 30, yoyo: true, repeat: -1, duration: 300, ease: 'Sine.easeInOut' });
    }

    private triggerDefeat(reason: 'time' | 'stamina' | 'cat'): void {
        this.isGameOver = true; this.puppy.stop(); this.cameras.main.shake(200, 0.01);
        if (reason === 'cat' && this.catSprite) this.tweens.add({ targets: this.catSprite, x: this.puppy.x, y: this.puppy.y - 10, scale: 2, duration: 300, ease: 'Bounce.easeOut' });
        else if (reason === 'time') this.tweens.add({ targets: this.puppy, angle: 90, duration: 500, ease: 'Bounce.easeOut' });
        else if (reason === 'stamina') this.puppy.setTint(0x88aaff);
        
        this.time.delayedCall(1500, () => this.showDefeatScreen(reason));
    }

    private showDefeatScreen(reason: 'time' | 'stamina' | 'cat'): void {
        const { width: W, height: H } = this.scale;
        const cx = W / 2, cy = H / 2;
        this.add.rectangle(0, 0, W, H, 0x0a0010, 0.82).setOrigin(0).setDepth(100).setInteractive();
        const cardW = Math.min(460, W * 0.85);
        const cardH = 290;
        const r = 20;
        const info = {
            time:    { header: '⏰ Time Ran Out!',       body: 'You spent too many time units.\nTry a more direct route next time!',  border: 0xc0392b, icon: '⏰' },
            stamina: { header: '❤️ Stamina Depleted!',   body: 'You exhausted all your stamina.\nLook for cheaper paths!',            border: 0x8e44ad, icon: '❤️' },
            cat:     { header: '😿 Caught by the Cat!', body: 'The cat intercepted you!\nMove faster or find a safer route.',        border: 0xd35400, icon: '😿' }
        }[reason];
        const mb = this.level.catStartNodeId === undefined ? this.energyGameResult?.minBudget : undefined;
        const optLine = mb
            ? `Resource estimate: ⏰ ${mb.time} time  ❤️ ${mb.stamina} stamina\n(You started with ⏰ ${this.level.initialResources.time}  ❤️ ${this.level.initialResources.stamina})`
            : '';
        const items: Phaser.GameObjects.GameObject[] = [];
        const bg = this.add.graphics();
        drawPixelPanel(bg, cardW, cardH);
        items.push(bg);
        const headerBand = this.add.graphics();
        headerBand.fillStyle(0xc7cdbc, 0.7);
        headerBand.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, 52, { tl: r, tr: r, bl: 0, br: 0 });
        items.push(headerBand);
        items.push(this.add.text(-cardW / 2 + 12, -cardH / 2 + 8, info.icon, { fontSize: '22px' }));
        items.push(this.add.text(cardW / 2 - 38, -cardH / 2 + 8, info.icon, { fontSize: '22px' }));
        items.push(this.add.text(0, -cardH / 2 + 26, info.header, { fontSize: '24px', fontStyle: 'bold', fontFamily: PIXEL_FONT, color: PANEL_TEXT, align: 'center' }).setOrigin(0.5));
        items.push(this.add.text(0, -cardH / 2 + 100, info.body, { fontSize: '15px', fontFamily: PIXEL_FONT, color: PANEL_TEXT, align: 'center', wordWrap: { width: cardW - 40 } }).setOrigin(0.5));
        if (optLine) items.push(this.add.text(0, -cardH / 2 + 162, optLine, { fontSize: '14px', fontFamily: PIXEL_FONT, color: '#77583E', align: 'center', wordWrap: { width: cardW - 40 } }).setOrigin(0.5));
        const tryBg = this.add.rectangle(-75, cardH / 2 - 44, 130, 42, 0x27ae60).setStrokeStyle(2, 0xffffff, 0.7).setInteractive({ useHandCursor: true });
        items.push(tryBg, this.add.text(-75, cardH / 2 - 44, 'Try Again', { fontSize: '17px', fontStyle: 'bold', color: '#fff' }).setOrigin(0.5));
        const menuBg = this.add.rectangle(85, cardH / 2 - 44, 130, 42, 0x4a3555).setStrokeStyle(2, 0xffffff, 0.4).setInteractive({ useHandCursor: true });
        items.push(menuBg, this.add.text(85, cardH / 2 - 44, '🏠 Menu', { fontSize: '16px', color: '#d5c5a0' }).setOrigin(0.5));
        const popup = this.add.container(cx, cy, items).setDepth(101).setAlpha(0);
        this.tweens.add({ targets: popup, alpha: 1, duration: 400, ease: 'Back.easeOut' });
        tryBg.once('pointerdown', () => { this.scene.stop('HudScene'); this.scene.restart(); });
        menuBg.once('pointerdown', () => { this.scene.stop('HudScene'); this.scene.start('MenuScene'); });
    }

    private showLevelIntro(onStart: () => void): void {
        const { width: W, height: H } = this.scale;
        const overlay = this.add.rectangle(0, 0, W, H, 0x263529, 0.58).setOrigin(0).setDepth(3000).setInteractive();
        const cardW = 480, cardH = 318;
        const bg = this.add.graphics(); drawPixelPanel(bg, cardW, cardH);
        const descriptions = [
            'Learn the trail: choose a stop, collect a bone, and reach home.',
            'Choose between a quick tiring route and a slower gentle route.',
            'Explore the mist. Keep enough time and stamina for the way home.',
            'Take the bone, use the woodland detour, and stay ahead of the cat.',
        ];
        const items: Phaser.GameObjects.GameObject[] = [bg];
        items.push(this.add.text(0, -122, this.levelIndex === 0 ? 'YOUR FIRST TRAIL' : this.level.title.toUpperCase(), { fontFamily: PIXEL_FONT, fontSize: '22px', fontStyle: 'bold', color: PANEL_TEXT }).setOrigin(0.5));
        items.push(this.add.text(0, -65, descriptions[this.levelIndex], { fontFamily: PIXEL_FONT, fontSize: '15px', color: PANEL_TEXT, align: 'center', lineSpacing: 6, wordWrap: { width: cardW - 72 } }).setOrigin(0.5));
        items.push(this.add.text(0, 1, 'Take a bone home. Keep both resources at 0 or above.', { fontFamily: PIXEL_FONT, fontSize: '12px', color: '#77583E', align: 'center', wordWrap: { width: cardW - 72 } }).setOrigin(0.5));
        const icons = this.add.graphics();
        drawResourceIcon(icons, 'time', -135, 43); drawResourceIcon(icons, 'stamina', 25, 43); items.push(icons);
        items.push(this.add.text(-120, 43, `TIME ${this.level.initialResources.time}`, { fontFamily: PIXEL_FONT, fontSize: '14px', fontStyle: 'bold', color: PANEL_TEXT }).setOrigin(0, 0.5));
        items.push(this.add.text(40, 43, `STAM ${this.level.initialResources.stamina}`, { fontFamily: PIXEL_FONT, fontSize: '14px', fontStyle: 'bold', color: PANEL_TEXT }).setOrigin(0, 0.5));
        const btnBg = makePixelButton(this, 0, 110, 192, 'START THE TRAIL').setName('start-trail'); items.push(btnBg);
        const container = this.add.container(W / 2, H / 2 + 12, items).setName('level-intro').setDepth(3001).setAlpha(0);
        this.tweens.add({ targets: container, alpha: 1, y: H / 2, duration: 240, ease: 'Sine.easeOut' });
        btnBg.once('pointerdown', () => {
            overlay.destroy();
            this.tweens.add({ targets: container, alpha: 0, y: H / 2 - 12, duration: 180, ease: 'Sine.easeIn', onComplete: () => { container.destroy(); onStart(); } });
        });
    }

    private drawGraph(): void {
        const rendered = new Set<string>();
        this.graph.forEach(node => {
            node.neighbors.forEach(e => {
                const neighbor = this.graph.find(n => n.id === e.targetId)!;
                const angle = Phaser.Math.Angle.Between(node.x, node.y, neighbor.x, neighbor.y);
                const px = Math.cos(angle - Math.PI / 2), py = Math.sin(angle - Math.PI / 2);
                const startX = node.x + px * 12, startY = node.y + py * 12;
                const endX = neighbor.x + px * 12, endY = neighbor.y + py * 12;

                this.edgeGraphicsMap.set(`${node.id}-${e.targetId}`, this.add.graphics().lineStyle(4, 0x87a1ff, 0.6).beginPath().moveTo(startX, startY).lineTo(endX, endY));

                const uKey = `${Math.min(node.id, e.targetId)}-${Math.max(node.id, e.targetId)}`;
                if (!rendered.has(uKey)) {
                    rendered.add(uKey);
                    const lx = (node.x + neighbor.x) / 2 + px * 24 + (e.labelOffset?.x ?? 0);
                    const ly = (node.y + neighbor.y) / 2 + py * 24 + (e.labelOffset?.y ?? 0);
                    const ui = this.createEffectBars(lx, ly, e.effects);
                    if (ui) { ui.setAlpha(0); this.edgeTextsMap.set(`${node.id}-${e.targetId}`, ui); this.edgeTextsMap.set(`${e.targetId}-${node.id}`, ui); }
                }
            });

            const obj = node.type === NodeType.DEFENDER ? createDefenderTrapIcon(this, node.x, node.y, 20).setInteractive(new Phaser.Geom.Circle(0, 0, 24), Phaser.Geom.Circle.Contains) : this.add.circle(node.x, node.y, 24, 0x000, 0).setInteractive({ useHandCursor: true });
            this.nodeGraphicsMap.set(node.id, obj);
            
            const toggleTrap = (speed: number, alpha: number) => {
                if (this.triggeredTraps.has(node.id)) return;
                if (node.type === NodeType.DEFENDER && !this.triggeredTraps.has(node.id)) {
                    obj.getData('spikeTween')?.setTimeScale(speed);
                    obj.getData('coreGfx')?.setAlpha(alpha);
                }
            };

            obj.on('pointerover', () => {
                if (this.isTutorialActive || this.isMoving || this.isCatMoving || this.isGameOver || (this.isFogOfWar && !this.revealedNodes.has(node.id))) return;
                toggleTrap(4, 0.8);
                
                const isNeighbor = this.graph.find(n => n.id === this.currentNodeId)?.neighbors.some(e => e.targetId === node.id) ?? false;
                const tt = node.type === NodeType.DEFENDER && !this.triggeredTraps.has(node.id) ? '🐿️ Squirrel Node:\nThe squirrel picks the hardest path for you!' : node.nodeEffects?.some(e => e.resource === 'bones' && e.value > 0) ? 'Bone Node:\nCollect to increase score.' : (this.levelIndex === 0 && isNeighbor) ? 'Walkable Path:\nClick to move here.' : '';
                if (tt) {
                    this.tooltipText.setText(tt);
                    const w = this.tooltipText.width + 40, h = this.tooltipText.height + 36;
                    drawPixelPanel(this.tooltipBg, w, h);
                    this.tooltipContainer.setPosition(
                        Phaser.Math.Clamp(node.x + (node.x > this.scale.width / 2 ? -1 : 1) * (w / 2 + 48), w / 2 + 8, this.scale.width - w / 2 - 8),
                        Phaser.Math.Clamp(node.y - 52, h / 2 + 86, this.scale.height - h / 2 - 8),
                    );
                    this.tweens.killTweensOf(this.tooltipContainer);
                    this.tooltipContainer.setAlpha(0);
                    this.tweens.add({ targets: this.tooltipContainer, alpha: 1, duration: 140 });
                }

                if (!this.registry.get('goalReached') && !this.isMoving && !this.isGameOver && !this.isCatMoving) {
                    const edge = this.graph.find(n => n.id === this.currentNodeId)?.neighbors.find(e => e.targetId === node.id);
                    if (edge) this.registry.set('preview', applyEffects(applyEffects(this.currentResources, edge.effects, this.level.maxResources), node.nodeEffects || [], this.level.maxResources));
                }
            });

            obj.on('pointerout', () => { if (!this.isTutorialActive) { this.registry.set('preview', null); this.tweens.killTweensOf(this.tooltipContainer); this.tooltipContainer.setAlpha(0); toggleTrap(1, 0.2); }});
            obj.on('pointerdown', () => { if (!this.isTutorialActive && !(this.isFogOfWar && !this.revealedNodes.has(node.id))) this.moveToNextNode(node.id); });
            if (node.nodeEffects?.length) this.nodeEffectTextsMap.set(node.id, this.createEffectBars(node.x + (node.nodeLabelOffset?.x ?? 0), node.y - 108, node.nodeEffects)!);
        });
        this.arrangeMapBadges();
    }

    private highlightPossibleMoves(): void {
        if (this.registry.get('goalReached') || this.isCatMoving) return;
        const cur = this.graph.find(n => n.id === this.currentNodeId)!;

        // Show edge cost labels only for paths from the current node
        this.edgeTextsMap.forEach(c => c.setAlpha(0));
        cur.neighbors.forEach(edge => {
            this.edgeTextsMap.get(`${cur.id}-${edge.targetId}`)?.setAlpha(1);
        });;
        
        if (cur.type === NodeType.DEFENDER && !this.triggeredTraps.has(cur.id)) {
            this.isTutorialActive = true;
            const alert = this.add.text(this.puppy.x, this.puppy.y - 40, '❗', { fontSize: '24px', fontStyle: 'bold' }).setOrigin(0.5).setDepth(30);
            const sq = this.add.sprite(cur.x + 50, cur.y, 'squirrel_img').setOrigin(0.5, 0.9).setDepth(9).setScale(2).setFlipX(true);
            this.safePlay(sq, 'squirrel_idle');

            const squirrelMsg = this.levelIndex === 0 && !this.triggeredTraps.has(cur.id)
                ? 'A Squirrel Node! 🐿️\nThe squirrel blocks your free choice and forces you onto the HARDEST path — maximum Time and Stamina cost.\nWatch out for squirrels!'
                : 'Oh look! A playful squirrel dashed out from the bushes!';
            this.showDialogue(squirrelMsg, () => {
                alert.destroy();
                if (this.isMoving || this.isGameOver) { this.isTutorialActive = false; sq.destroy(); return; }

                const calcEdgeCost = (edge: typeof cur.neighbors[0]) => {
                    const dt = edge.effects?.filter(e => e.op === 'add' && e.resource === 'time').reduce((s, e) => s + e.value, 0) ?? 0;
                    const ds = edge.effects?.filter(e => e.op === 'add' && e.resource === 'stamina').reduce((s, e) => s + e.value, 0) ?? 0;
                    return { time: -dt, stamina: -ds };
                };
                const costs = cur.neighbors.map(e => ({ edge: e, cost: calcEdgeCost(e) }));
                const maxTime = Math.max(...costs.map(c => c.cost.time));
                const topTime = costs.filter(c => c.cost.time === maxTime);
                const maxStamina = Math.max(...topTime.map(c => c.cost.stamina));
                const candidates = topTime.filter(c => c.cost.stamina === maxStamina);
                const nextId = candidates.length ? candidates[Math.floor(Math.random() * candidates.length)].edge.targetId : null;
                
                if (nextId !== null) {
                    this.triggeredTraps.add(cur.id);
                    this.registry.set('nodeType', NodeType.PLAYER);
                    const trap = this.nodeGraphicsMap.get(cur.id) as Phaser.GameObjects.Container;
                    trap?.getData('spikeTween')?.stop();
                    trap?.setData('consumed', true);
                    if (trap?.list) this.tweens.add({ targets: trap.list, alpha: 0, duration: 220 });
                    this.nodeEffectTextsMap.get(cur.id)?.setAlpha(0);

                    const edge = cur.neighbors.find(e => e.targetId === nextId)!;
                    const path = edge.pathNodes?.length ? edge.pathNodes : [{ x: this.graph.find(n=>n.id===nextId)!.x, y: this.graph.find(n=>n.id===nextId)!.y }];
                    
                    this.safePlay(sq, 'squirrel_run');
                    this.tweens.killTweensOf(sq);

                    const moveSquirrelStep = (i: number) => {
                        if (i >= path.length) {
                            this.safePlay(sq, 'squirrel_idle');
                            this.tweens.add({ targets: sq, alpha: 0, duration: 250, onComplete: () => sq.destroy() });
                            return;
                        }
                        const pt = path[i], prev = i > 0 ? path[i - 1] : sq;
                        if (pt.x < prev.x - 2) sq.setFlipX(false);
                        else if (pt.x > prev.x + 2) sq.setFlipX(true);
                        
                        const isLast = i === path.length - 1;
                        const dist = Phaser.Math.Distance.Between(sq.x, sq.y, pt.x + (isLast?35:0), pt.y - (isLast?10:0));
                        dist < 2 ? moveSquirrelStep(i + 1) : this.tweens.add({ targets: sq, x: pt.x + (isLast?35:0), y: pt.y - (isLast?10:0), duration: dist * 5, ease: 'Linear', onComplete: () => moveSquirrelStep(i + 1) });
                    };
                    moveSquirrelStep(0);
                    this.time.delayedCall(400, () => { this.isTutorialActive = false; this.skipCatMoveOnce = true; this.moveToNextNode(nextId); });
                } else { this.isTutorialActive = false; sq.destroy(); }
            }, true);
            return;
        }

        this.nodeGraphicsMap.forEach((obj, id) => { if (!(this.isFogOfWar && !this.revealedNodes.has(id)) && obj instanceof Phaser.GameObjects.Arc) obj.setStrokeStyle(0); });
        
        cur.neighbors.forEach(e => {
            const obj = this.nodeGraphicsMap.get(e.targetId);
            if (!obj || (this.isFogOfWar && !this.revealedNodes.has(e.targetId))) return;
            const res = applyEffects(this.currentResources, e.effects, this.level.maxResources);
            res.time >= 0 && res.stamina >= 0 ? this.activeHints.push(this.createMoveMarker(obj.x, obj.y)) : this.activeHints.push(this.createUnavailableMarker(obj.x, obj.y));
        });
    }
}
