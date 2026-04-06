import Phaser from 'phaser';
import { LEVELS } from '../levels/index';
import { applyEffects, ResourceVector, ResourceEffect, NodeType, LevelData, GraphNode } from '../levels/level-data';
import { computeEnergyGame, EnergyGameResult, buildCatChaseGraph } from '../engine/energy-game-engine';

export class MainScene extends Phaser.Scene {
    private level!: LevelData;
    private graph!: GraphNode[];

    private puppy!: Phaser.GameObjects.Sprite;
    private currentNodeId!: number;
    private isMoving = false;
    private isGameOver = false;

    private isFogOfWar = false;
    private revealedNodes: Set<number> = new Set();

    private nodeGraphicsMap: Map<number, Phaser.GameObjects.Arc> = new Map();
    private nodeTextsMap: Map<number, Phaser.GameObjects.Text> = new Map();
    private edgeGraphicsMap: Map<string, Phaser.GameObjects.Graphics> = new Map();
    private edgeTextsMap: Map<string, Phaser.GameObjects.Container> = new Map();
    private nodeEffectTextsMap: Map<number, Phaser.GameObjects.Container> = new Map();

    private currentResources!: ResourceVector;
    private energyGameResult!: EnergyGameResult;
    private activeHints: Phaser.GameObjects.GameObject[] = [];

    // Cat properties
    private catSprite?: Phaser.GameObjects.Sprite;
    private catNodeId?: number;
    private isCatMoving = false;

    constructor() {
        super('MainScene');
    }

    init(data: { levelIndex: number }): void {
        const index = data.levelIndex ?? 0;
        this.level = LEVELS[index];
        this.graph = this.level.nodes;
        this.currentNodeId = this.level.startNodeId;
        this.isMoving = false;
        this.isGameOver = false;

        // Reset cat states to prevent lifecycle bugs when restarting or changing levels
        this.catNodeId = undefined;
        this.catSprite = undefined;
        this.isCatMoving = false;

        this.isFogOfWar = this.level.id === 'gradual-reveal';

        // If this level has a cat, build the expanded graph for the engine
        const graphForEngine = this.level.catStartNodeId !== undefined
            ? buildCatChaseGraph(this.level)
            : this.level;

        this.energyGameResult = computeEnergyGame(graphForEngine);
        console.log('[EnergyGame] minBudget:', this.energyGameResult.minBudget);

        this.revealedNodes.clear();
        this.nodeGraphicsMap.clear();
        this.nodeTextsMap.clear();
        this.edgeGraphicsMap.clear();
        this.edgeTextsMap.clear();
        this.nodeEffectTextsMap.clear();
    }

    preload(): void {
        this.load.spritesheet('puppy_run', 'assets/Splayer_strip4.png', {
            frameWidth: 64,
            frameHeight: 64
        });
        this.load.image('town_tiles', 'assets/tilemap_packed.png');
        this.load.tilemapTiledJSON('map', 'assets/map.json');
    }

    create(): void {
        // Ensure the bone texture exists for the map icons and flying animation
        this.createBoneTexture();

        const map = this.make.tilemap({ key: 'map' });
        const tileset = map.addTilesetImage('town_tiles', 'town_tiles');

        if (tileset) {
            const bgLayer = map.createLayer('background', tileset, 0, 0);
            const mgLayer = map.createLayer('midground', tileset, 0, 0);
            const fgLayer = map.createLayer('foreground', tileset, 0, 0);
            if (bgLayer) bgLayer.setScale(2.5);
            if (mgLayer) mgLayer.setScale(2.5);
            if (fgLayer) fgLayer.setScale(2.5);
        }

        const dotGraphics = this.make.graphics({ x: 0, y: 0 }).fillStyle(0xffffff, 1).fillCircle(4, 4, 4);
        dotGraphics.generateTexture('white_dot', 8, 8);
        dotGraphics.destroy();

        this.currentResources = { ...this.level.initialResources };
        this.registry.set('resources', this.currentResources);
        this.registry.set('preview', null);
        this.registry.set('goalReached', false);
        this.registry.set('node', this.currentNodeId);
        this.registry.set('energyGameResult', this.energyGameResult);
        this.registry.set('initialResources', { ...this.level.initialResources });

        this.scene.launch('HudScene');

        this.drawGraph();

        if (this.isFogOfWar) {
            this.nodeGraphicsMap.forEach(c => c.setAlpha(0));
            this.nodeTextsMap.forEach(t => t.setAlpha(0));
            this.edgeGraphicsMap.forEach(g => g.setAlpha(0));
            this.edgeTextsMap.forEach(t => t.setAlpha(0));
            this.nodeEffectTextsMap.forEach(t => t.setAlpha(0));

            this.revealNode(this.currentNodeId, false);
            this.revealEdgesFrom(this.currentNodeId, false);
        }

        this.add.text(18, 600, `Level: ${this.level.title}`, { color: '#f6f8ff', fontSize: '14px' });

        const start = this.graph.find(n => n.id === this.currentNodeId)!;

        this.puppy = this.add.sprite(start.x, start.y, 'puppy_run');
        this.puppy.setScale(1.5);
        this.puppy.setDepth(10);
        this.puppy.setOrigin(0.5, 0.9);

        this.anims.create({
            key: 'walk',
            frames: this.anims.generateFrameNumbers('puppy_run', { start: 0, end: 3 }),
            frameRate: 4,
            repeat: -1
        });

        this.anims.create({
            key: 'idle',
            frames: [{ key: 'puppy_run', frame: 0 }],
            frameRate: 10
        });

        // Initialize the cat if it exists in the level
        if (this.level.catStartNodeId !== undefined) {
            this.catNodeId = this.level.catStartNodeId;
            const catStartNode = this.graph.find(n => n.id === this.catNodeId)!;
            this.catSprite = this.add.sprite(catStartNode.x, catStartNode.y, 'puppy_run');
            this.catSprite.setScale(1.5).setDepth(11).setOrigin(0.5, 0.9).setTint(0xff5555);
        }

        this.registry.set('nodeType', start.type);
        this.highlightPossibleMoves();
    }

    // Helper to dynamically generate the bone texture if it hasn't been created yet
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

    private createMagicDustEmitter(x: number, y: number, color: number): Phaser.GameObjects.GameObject {
        const emitter = this.add.particles(x, y, 'white_dot', {
            speed: { min: 10, max: 25 },
            gravityY: -5,
            emitZone: { type: 'random', source: new Phaser.Geom.Circle(0, 0, 12) },
            scale: { start: 0, end: 0.8, ease: 'Back.easeOut' },
            alpha: { start: 0, end: 1, ease: 'Power1.easeIn' },
            lifespan: { min: 1000, max: 2500 },
            frequency: 40,
            quantity: 1,
            tint: color,
            blendMode: 'ADD'
        });
        emitter.setDepth(100);
        return emitter;
    }

    private revealNode(nodeId: number, animate: boolean): void {
        if (!this.revealedNodes.has(nodeId)) {
            this.revealedNodes.add(nodeId);
            const circle = this.nodeGraphicsMap.get(nodeId);
            const txt = this.nodeTextsMap.get(nodeId);
            const fxTxt = this.nodeEffectTextsMap.get(nodeId);

            if (circle) {
                if (animate) {
                    const targets: Phaser.GameObjects.GameObject[] = [circle];
                    if (txt) targets.push(txt);
                    if (fxTxt) targets.push(fxTxt);
                    this.tweens.add({ targets, alpha: 1, duration: 600 });
                } else {
                    circle.setAlpha(1);
                    if (txt) txt.setAlpha(1);
                    if (fxTxt) fxTxt.setAlpha(1);
                }
            }
        }
    }

    private revealEdgesFrom(nodeId: number, animate: boolean): void {
        const node = this.graph.find(n => n.id === nodeId);
        if (!node) return;

        for (const edge of node.neighbors) {
            const edgeKey = `${node.id}-${edge.targetId}`;
            const g = this.edgeGraphicsMap.get(edgeKey);
            const t = this.edgeTextsMap.get(edgeKey);

            if (g && g.alpha === 0) {
                if (animate) {
                    const targets = t ? [g, t] : [g];
                    this.tweens.add({ targets, alpha: 1, duration: 600 });
                } else {
                    g.setAlpha(1);
                    if (t) t.setAlpha(1);
                }
            }

            this.revealNode(edge.targetId, animate);
        }
    }

    // Advanced UI: Generates dynamic effect bars or bone icons
    private createEffectBars(x: number, y: number, effects: ResourceEffect[] | undefined): Phaser.GameObjects.Container | null {
        if (!effects || effects.length === 0) return null;

        const container = this.add.container(x, y);
        const graphics = this.add.graphics();
        container.add(graphics);

        const barW = 46;
        const barH = 14;
        const spacing = 18;
        const totalHeight = effects.length * spacing;
        const startY = -totalHeight / 2 + barH / 2;

        effects.forEach((effect, index) => {
            const offsetY = startY + index * spacing - barH / 2;

            // 1. Handle Bones differently (Display Icon instead of a bar)
            if (effect.resource === 'bones') {
                const boneImg = this.add.image(-12, offsetY + barH / 2, 'bone_icon').setScale(1.2);
                const text = this.add.text(10, offsetY + barH / 2, `+${effect.value}`, {
                    fontSize: '14px', fontStyle: 'bold', color: '#ffffff', stroke: '#000000', strokeThickness: 3
                }).setOrigin(0.5);
                container.add([boneImg, text]);
                return; // Skip drawing the bar logic for bones
            }

            // 2. Handle Time and Stamina bars
            const isCost = effect.value < 0; // Negative values are costs

            let mainColor = 0xffffff;
            let resChar = 'B';

            if (effect.resource === 'time') {
                mainColor = isCost ? 0xe74c3c : 0xf1c40f; // Red for cost, Yellow for gain
                resChar = 'T';
            } else if (effect.resource === 'stamina') {
                mainColor = isCost ? 0xe74c3c : 0x2ecc71; // Red for cost, Green for gain
                resChar = 'S';
            }

            const valStr = effect.value > 0 ? `+${effect.value} ${resChar}` : `${effect.value} ${resChar}`;
            const fillW = Math.min(Math.abs(effect.value) * 1.5, barW);

            // Background (Dark)
            graphics.fillStyle(0x1a252f, 0.9);
            graphics.fillRoundedRect(-barW / 2, offsetY, barW, barH, 3);

            // Fill Bar
            graphics.fillStyle(mainColor, 1);
            if (isCost) {
                // If it's a cost, draw the red bar starting from the RIGHT edge inwards
                graphics.fillRoundedRect(barW / 2 - fillW, offsetY, fillW, barH, 3);
            } else {
                // If it's a gain, draw the normal bar starting from the LEFT edge outwards
                graphics.fillRoundedRect(-barW / 2, offsetY, fillW, barH, 3);
            }

            // Outer Border
            graphics.lineStyle(1, 0x000000, 0.8);
            graphics.strokeRoundedRect(-barW / 2, offsetY, barW, barH, 3);

            // Text Outline
            const text = this.add.text(0, offsetY + barH / 2, valStr, {
                fontSize: '11px',
                fontStyle: 'bold',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 3
            }).setOrigin(0.5);

            container.add(text);
        });

        container.setDepth(5);
        return container;
    }

    private moveToNextNode(targetNodeId: number): void {
        if (this.isMoving || this.isGameOver || this.isCatMoving) return;

        const currentNode = this.graph.find(n => n.id === this.currentNodeId)!;
        const edge = currentNode.neighbors.find(e => e.targetId === targetNodeId);

        if (!edge) {
            console.log("Too far! Puppy can't be there!");
            return;
        }

        const nextResources = applyEffects(this.currentResources, edge.effects, this.level.maxResources);

        if (nextResources.time < 0) {
            this.triggerDefeat('time');
            return;
        }

        if (nextResources.stamina < 0) {
            this.triggerDefeat('stamina');
            return;
        }

        if (targetNodeId === this.level.goalNodeId && nextResources.bones < 1) {
            this.cameras.main.shake(200, 0.01);
            return;
        }

        this.clearHints();

        this.isMoving = true;
        this.currentResources = nextResources;
        this.registry.set('resources', this.currentResources);

        const targetNode = this.graph.find(n => n.id === targetNodeId)!;

        if (edge.pathNodes && edge.pathNodes.length > 0) {
            this.moveAlongPath(edge.pathNodes, targetNode);
        } else {
            if (targetNode.x < this.puppy.x) {
                this.puppy.setFlipX(true);
            } else if (targetNode.x > this.puppy.x) {
                this.puppy.setFlipX(false);
            }

            this.puppy.play('walk');

            this.tweens.add({
                targets: this.puppy,
                x: targetNode.x,
                y: targetNode.y,
                duration: 2500,
                ease: 'Power2',
                onComplete: () => {
                    this.handleMoveCompletion(targetNodeId, targetNode);
                }
            });
        }
    }

    private clearHints(): void {
        this.activeHints.forEach(hint => {
            if (hint) {
                hint.destroy();
            }
        });
        this.activeHints = [];
    }

    private moveAlongPath(path: { x: number, y: number }[], targetNode: GraphNode): void {
        const moveStep = (index: number) => {
            if (index >= path.length) {
                this.handleMoveCompletion(targetNode.id, targetNode);
                return;
            }

            const targetPoint = path[index];
            const prevPoint = index > 0 ? path[index - 1] : this.puppy;

            if (targetPoint.x < prevPoint.x - 2) {
                this.puppy.setFlipX(true);
            } else if (targetPoint.x > prevPoint.x + 2) {
                this.puppy.setFlipX(false);
            }

            const distance = Phaser.Math.Distance.Between(this.puppy.x, this.puppy.y, targetPoint.x, targetPoint.y);

            if (distance < 2) {
                moveStep(index + 1);
                return;
            }

            const duration = (distance / 100) * 800;

            this.tweens.add({
                targets: this.puppy,
                x: targetPoint.x,
                y: targetPoint.y,
                duration: duration,
                ease: 'Linear',
                onComplete: () => {
                    moveStep(index + 1);
                }
            });
        };

        this.puppy.play('walk');
        moveStep(1);
    }

    private handleMoveCompletion(targetNodeId: number, targetNode: GraphNode): void {
        this.puppy.play('idle');
        this.currentNodeId = targetNodeId;
        this.registry.set('node', this.currentNodeId);
        this.registry.set('nodeType', targetNode.type);

        if (targetNode.nodeEffects && targetNode.nodeEffects.length > 0) {
            this.currentResources = applyEffects(this.currentResources, targetNode.nodeEffects, this.level.maxResources);
            this.registry.set('resources', this.currentResources);

            // New Animation: Trigger the flying bone animation if a bone was collected
            const boneEffect = targetNode.nodeEffects.find(e => e.resource === 'bones' && e.value > 0);
            if (boneEffect && !this.registry.get(`bone_collected_${targetNodeId}`)) {
                this.registry.set(`bone_collected_${targetNodeId}`, true);

                // Fade out the bone icon UI on the map since we collected it
                const effectUI = this.nodeEffectTextsMap.get(targetNodeId);
                if (effectUI) {
                    this.tweens.add({ targets: effectUI, alpha: 0, duration: 300 });
                }

                // Create a temporary bone sprite to animate flying to the HUD
                const flyingBone = this.add.image(this.puppy.x, this.puppy.y - 30, 'bone_icon').setScale(1.5).setDepth(200);

                // Target coordinates in the HUD Scene (Top Right Area)
                const targetX = this.cameras.main.scrollX + 430;
                const targetY = this.cameras.main.scrollY + 60;

                this.tweens.add({
                    targets: flyingBone,
                    x: targetX,
                    y: targetY,
                    scale: 2.5, // Scale up during flight for visual emphasis
                    rotation: Math.PI * 4, // Spin it!
                    duration: 600,
                    ease: 'Power2',
                    onComplete: () => {
                        flyingBone.destroy(); // Destroy sprite after reaching HUD
                    }
                });
            }
        }

        if (this.isFogOfWar) {
            this.revealEdgesFrom(targetNodeId, true);
        }

        this.isMoving = false;

        if (this.currentNodeId === this.level.goalNodeId) {
            this.registry.set('finalResources', { ...this.currentResources });
            this.registry.set('goalReached', true);
            this.highlightPossibleMoves();
            this.triggerVictory();
        } else {
            if (this.catNodeId !== undefined) {
                if (this.currentNodeId === this.catNodeId) {
                    this.triggerDefeat('cat');
                } else {
                    this.moveCat();
                }
            } else {
                this.highlightPossibleMoves();
            }
        }
    }

    private moveCat(): void {
        if (this.catNodeId === undefined || !this.catSprite || this.isGameOver) return;

        const catNode = this.graph.find(n => n.id === this.catNodeId)!;
        const budgets = this.energyGameResult.nodeWinBudgets;

        let bestTarget = catNode.neighbors[0]?.targetId || this.catNodeId;

        if (catNode.neighbors.some(e => e.targetId === this.currentNodeId)) {
            bestTarget = this.currentNodeId;
        } else {
            let maxTimeCost = -1;
            let minPhysicalDistance = Infinity;

            for (const edge of catNode.neighbors) {
                const nextPlayerStateId = (this.currentNodeId * 1000) + edge.targetId;
                const cost = budgets.get(nextPlayerStateId)?.time ?? 0;

                const targetNode = this.graph.find(n => n.id === edge.targetId)!;
                const playerNode = this.graph.find(n => n.id === this.currentNodeId)!;
                const dist = Phaser.Math.Distance.Between(targetNode.x, targetNode.y, playerNode.x, playerNode.y);

                if (cost > maxTimeCost) {
                    maxTimeCost = cost;
                    bestTarget = edge.targetId;
                    minPhysicalDistance = dist;
                }
                else if (cost === maxTimeCost) {
                    if (dist < minPhysicalDistance) {
                        minPhysicalDistance = dist;
                        bestTarget = edge.targetId;
                    }
                }
            }
        }

        this.isCatMoving = true;
        const targetNode = this.graph.find(n => n.id === bestTarget)!;

        if (targetNode.x < this.catSprite.x) this.catSprite.setFlipX(true);
        else if (targetNode.x > this.catSprite.x) this.catSprite.setFlipX(false);
        this.catSprite.play('walk');

        this.tweens.add({
            targets: this.catSprite,
            x: targetNode.x,
            y: targetNode.y,
            duration: 800,
            ease: 'Linear',
            onComplete: () => {
                this.catSprite?.stop();
                this.catNodeId = bestTarget;
                this.isCatMoving = false;

                if (this.catNodeId === this.currentNodeId) {
                    this.triggerDefeat('cat');
                } else {
                    this.highlightPossibleMoves();
                }
            }
        });
    }

    private triggerVictory(): void {
        this.isGameOver = true;
        this.tweens.add({
            targets: this.puppy,
            y: this.puppy.y - 30,
            yoyo: true,
            repeat: -1,
            duration: 300,
            ease: 'Sine.easeInOut'
        });
    }

    private triggerDefeat(reason: 'time' | 'stamina' | 'cat'): void {
        this.isGameOver = true;
        this.puppy.stop();
        this.cameras.main.shake(200, 0.01);

        let message = '';

        if (reason === 'cat') {
            message = 'Oh no! The cat caught the puppy!';
            if (this.catSprite) {
                this.catSprite.setDepth(20);
                this.tweens.add({
                    targets: this.catSprite,
                    x: this.puppy.x,
                    y: this.puppy.y - 10,
                    scale: 2,
                    duration: 300,
                    ease: 'Bounce.easeOut'
                });
            }
        } else if (reason === 'time') {
            message = 'Out of time! The puppy fell asleep.';
            this.tweens.add({
                targets: this.puppy,
                angle: 90,
                duration: 500,
                ease: 'Bounce.easeOut'
            });

            const zzz = this.add.text(this.puppy.x + 20, this.puppy.y - 30, 'Zzz...', {
                fontSize: '24px', color: '#ffffff', fontStyle: 'bold'
            }).setDepth(20);

            this.tweens.add({
                targets: zzz, y: zzz.y - 40, alpha: 0, duration: 1500, repeat: -1
            });

        } else if (reason === 'stamina') {
            message = 'Out of stamina! The puppy is too tired.';
            this.puppy.setTint(0x88aaff);

            this.tweens.add({
                targets: this.puppy,
                scaleX: 1.6, scaleY: 1.3,
                yoyo: true, repeat: 3, duration: 250
            });

            const sweat = this.add.text(this.puppy.x + 10, this.puppy.y - 30, '💧', {
                fontSize: '20px'
            }).setDepth(20);

            this.tweens.add({
                targets: sweat, y: sweat.y + 20, alpha: 0, duration: 1000, repeat: -1
            });
        }

        this.time.delayedCall(1500, () => {
            this.showPopup('Defeat', message, 'Try Again', () => {
                this.scene.stop('HudScene');
                this.scene.restart();
            }, false);
        });
    }

    private showPopup(title: string, message: string, btnText: string, onClick: () => void, isWin: boolean): void {
        const { width, height } = this.scale;
        const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.7).setOrigin(0).setDepth(100);

        const popupBg = this.add.rectangle(width / 2, height / 2, 400, 250, isWin ? 0x27ae60 : 0xc0392b)
            .setOrigin(0.5).setDepth(101).setStrokeStyle(4, 0xffffff);

        this.add.text(width / 2, height / 2 - 70, title, {
            fontSize: '32px', color: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(102);

        this.add.text(width / 2, height / 2 - 10, message, {
            fontSize: '18px', color: '#f6f8ff', align: 'center', wordWrap: { width: 360 }
        }).setOrigin(0.5).setDepth(102);

        const btnBg = this.add.rectangle(width / 2, height / 2 + 70, 200, 50, 0xffffff)
            .setOrigin(0.5).setDepth(102).setInteractive({ useHandCursor: true });

        this.add.text(width / 2, height / 2 + 70, btnText, {
            fontSize: '20px', color: isWin ? '#27ae60' : '#c0392b', fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(103);

        btnBg.on('pointerover', () => btnBg.setFillStyle(0xe0e0e0));
        btnBg.on('pointerout', () => btnBg.setFillStyle(0xffffff));
        btnBg.on('pointerdown', onClick);
    }

    private drawGraph(): void {
        for (const node of this.graph) {
            for (const edge of node.neighbors) {
                const neighbor = this.graph.find(n => n.id === edge.targetId)!;
                const angle = Phaser.Math.Angle.Between(node.x, node.y, neighbor.x, neighbor.y);
                const offset = 12;

                const startX = node.x + Math.cos(angle - Math.PI / 2) * offset;
                const startY = node.y + Math.sin(angle - Math.PI / 2) * offset;
                const endX = neighbor.x + Math.cos(angle - Math.PI / 2) * offset;
                const endY = neighbor.y + Math.sin(angle - Math.PI / 2) * offset;

                const graphics = this.add.graphics();
                graphics.lineStyle(4, 0x87a1ff, 0.6);
                graphics.beginPath();
                graphics.moveTo(startX, startY);
                graphics.lineTo(endX, endY);

                const edgeKey = `${node.id}-${edge.targetId}`;
                this.edgeGraphicsMap.set(edgeKey, graphics);

                const effectContainer = this.createEffectBars(
                    startX + (endX - startX) * 0.35,
                    startY + (endY - startY) * 0.35,
                    edge.effects
                );

                if (effectContainer) {
                    this.edgeTextsMap.set(edgeKey, effectContainer);
                }
            }
        }

        for (const node of this.graph) {
            const nodeCircle = this.add.circle(node.x, node.y, 24, 0x000000, 0);
            nodeCircle.setInteractive({ useHandCursor: true });
            this.nodeGraphicsMap.set(node.id, nodeCircle);

            nodeCircle.on('pointerover', () => {
                if (this.isFogOfWar && !this.revealedNodes.has(node.id)) return;
                if (this.registry.get('goalReached') || this.isMoving || this.isGameOver || this.isCatMoving) return;

                const currentNode = this.graph.find(n => n.id === this.currentNodeId)!;
                const edge = currentNode.neighbors.find(e => e.targetId === node.id);
                if (edge) {
                    let preview = applyEffects(this.currentResources, edge.effects, this.level.maxResources);
                    if (node.nodeEffects) preview = applyEffects(preview, node.nodeEffects, this.level.maxResources);
                    this.registry.set('preview', preview);
                }
            });

            nodeCircle.on('pointerout', () => this.registry.set('preview', null));

            nodeCircle.on('pointerdown', () => {
                if (this.isFogOfWar && !this.revealedNodes.has(node.id)) return;
                this.moveToNextNode(node.id);
            });

            if (node.nodeEffects && node.nodeEffects.length > 0) {
                const effectContainer = this.createEffectBars(node.x + 38, node.y, node.nodeEffects);
                if (effectContainer) {
                    this.nodeEffectTextsMap.set(node.id, effectContainer);
                }
            }
        }
    }

    private highlightPossibleMoves(): void {
        if (this.registry.get('goalReached') || this.isCatMoving) return;

        const currentNode = this.graph.find(n => n.id === this.currentNodeId)!;

        if (currentNode.type === NodeType.DEFENDER) {
            this.time.delayedCall(600, () => {
                if (this.isMoving || this.isGameOver) return;
                const targetId = this.pickDefenderMove(currentNode);
                if (targetId !== null) this.moveToNextNode(targetId);
            });
            return;
        }

        this.nodeGraphicsMap.forEach((circle, id) => {
            if (this.isFogOfWar && !this.revealedNodes.has(id)) return;
            circle.setStrokeStyle(0);
        });

        currentNode.neighbors.forEach(edge => {
            const circle = this.nodeGraphicsMap.get(edge.targetId);
            if (!circle) return;
            if (this.isFogOfWar && !this.revealedNodes.has(edge.targetId)) return;
            const nextResources = applyEffects(this.currentResources, edge.effects, this.level.maxResources);
            const isAffordable = nextResources.time >= 0 && nextResources.stamina >= 0;

            if (isAffordable) {
                circle.setStrokeStyle(0);
                const dust = this.createMagicDustEmitter(circle.x, circle.y, 0x88ccff);
                this.activeHints.push(dust);
            } else {
                circle.setStrokeStyle(3, 0xff4444, 0.7);
            }
        });
    }

    private pickDefenderMove(defenderNode: GraphNode): number | null {
        if (defenderNode.neighbors.length === 0) return null;

        const budgets = this.energyGameResult?.nodeWinBudgets;

        if (budgets) {
            let worstTarget = defenderNode.neighbors[0].targetId;
            let worstTime = -Infinity;
            for (const edge of defenderNode.neighbors) {
                const b = budgets.get(edge.targetId);
                const t = b ? b.time : 0;
                if (t > worstTime) { worstTime = t; worstTarget = edge.targetId; }
            }
            return worstTarget;
        }

        let worst = defenderNode.neighbors[0];
        for (const edge of defenderNode.neighbors) {
            const cost = (edge.effects ?? [])
                .filter(e => e.resource === 'time' && e.op === 'add')
                .reduce((s, e) => s + e.value, 0);
            const worstCost = (worst.effects ?? [])
                .filter(e => e.resource === 'time' && e.op === 'add')
                .reduce((s, e) => s + e.value, 0);
            if (cost < worstCost) worst = edge;
        }
        return worst.targetId;
    }
}