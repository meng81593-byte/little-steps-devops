import Phaser from 'phaser';
import { LEVELS } from '../levels/index';
import { applyEffects, ResourceVector, ResourceEffect, NodeType, LevelData, GraphNode } from '../levels/level-data';
import { computeEnergyGame, EnergyGameResult } from '../engine/energy-game-engine';

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
    private edgeTextsMap: Map<string, Phaser.GameObjects.Text> = new Map();
    private nodeEffectTextsMap: Map<number, Phaser.GameObjects.Text> = new Map();

    private currentResources!: ResourceVector;
    private energyGameResult!: EnergyGameResult;
    private activeHints: Phaser.GameObjects.GameObject[] = [];
    private activeDefender: Phaser.GameObjects.Sprite | null = null; 
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

        this.isFogOfWar = this.level.id === 'gradual-reveal';

        this.energyGameResult = computeEnergyGame(this.level);
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
        this.load.spritesheet('squirrel_img', 'assets/squirrel.png', {
            frameWidth: 50, 
            frameHeight: 45 
        });    
    }

    create(): void {
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

        this.anims.create({
            key: 'squirrel_idle',
            frames: this.anims.generateFrameNumbers('squirrel_img', { frames: [0, 1] }),
            frameRate: 4,
            repeat: -1
        });

        this.anims.create({
            key: 'squirrel_run',
            frames: this.anims.generateFrameNumbers('squirrel_img', { frames: [0, 1] }), 
            frameRate: 8, 
            repeat: -1
        });



        this.registry.set('nodeType', start.type);
        this.highlightPossibleMoves();
    }

private createMagicDustEmitter(x: number, y: number, color: number): Phaser.GameObjects.GameObject {
        const emitter = this.add.particles(x, y , 'white_dot', {
            // 1. 速度和重力
            speed: { min: 10, max: 25 }, 
            gravityY: -5, 
            
            // 2. 发射区域
            emitZone: { 
                type: 'random', 
                source: new Phaser.Geom.Circle(0, 0, 12) 
            },

            // 3. 视觉增强
            scale: { start: 0, end: 0.8, ease: 'Back.easeOut' }, 
            alpha: { start: 0, end: 1, ease: 'Power1.easeIn' }, 
            lifespan: { min: 1000, max: 2500 }, 
            
            frequency: 40,   // 之前是 80ms，现在 20ms 发射一次（快了 4 倍！）
            quantity: 1,     // 之前一次发 1 个，现在一次喷 2 个（总量又翻了一倍！）
            
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

    private formatEffects(effects: ResourceEffect[] | undefined): string {
        if (!effects || effects.length === 0) return '';
        return effects.map(e => {
            const res = e.resource === 'time' ? 'T' : e.resource === 'stamina' ? 'S' : 'B';
            if (e.op === 'set') return `${res}=${e.value}`;
            if (e.op === 'min') return `${res}≤${e.value}`;
            return e.value > 0 ? `+${e.value}${res}` : `${e.value}${res}`;
        }).join('\n');
    }


 private moveToNextNode(targetNodeId: number): void {
        if (this.isMoving || this.isGameOver) return;

        const currentNode = this.graph.find(n => n.id === this.currentNodeId)!;
        const edge = currentNode.neighbors.find(e => e.targetId === targetNodeId);

        if (!edge) {
            console.log("too far! Puppy can't be there!");
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
                hint.destroy(); // 彻底销毁发射器
            }
        });
        this.activeHints = []; // 清空数组
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
        if (this.activeDefender) {
            this.activeDefender.destroy();
            this.activeDefender = null;
        }

        this.puppy.play('idle');
        this.puppy.play('idle');
        this.currentNodeId = targetNodeId;
        this.registry.set('node', this.currentNodeId);
        this.registry.set('nodeType', targetNode.type);

        if (targetNode.nodeEffects && targetNode.nodeEffects.length > 0) {
            this.currentResources = applyEffects(this.currentResources, targetNode.nodeEffects, this.level.maxResources);
            this.registry.set('resources', this.currentResources);
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
            this.highlightPossibleMoves();
        }
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

        this.time.delayedCall(800, () => {
            this.showPopup('Level Complete!', 'The puppy reached home safely! 🎉', 'Back to Menu', () => {
                this.scene.stop('HudScene');
                this.scene.start('MenuScene');
            }, true);
        });
    }

    private triggerDefeat(reason: 'time' | 'stamina'): void {
        this.isGameOver = true;
        this.puppy.stop(); // Stop walk/idle animations to show defeat effect
        this.cameras.main.shake(200, 0.01);

        let message = '';

        if (reason === 'time') {
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
   // 👇 升级版：带全屏点击拦截和闪烁提示的 RPG 对话框
    private showDialogue(text: string, onComplete: () => void): void {
        const { width, height } = this.scale;
        const boxHeight = 90;
        const boxWidth = width * 0.8;

        // 1. 创建一个全屏透明层，用来拦截玩家的点击，防止点到背景的节点
        const blocker = this.add.rectangle(0, 0, width, height, 0x000000, 0)
            .setOrigin(0).setDepth(199).setInteractive({ useHandCursor: true });

        const container = this.add.container(width / 2, height + 100).setDepth(200);

        const bg = this.add.rectangle(0, 0, boxWidth, boxHeight, 0x000000, 0.8)
            .setStrokeStyle(4, 0xffffff, 1);
        
        const msg = this.add.text(0, 0, text, {
            fontSize: '22px', color: '#ffffff', fontStyle: 'bold', wordWrap: { width: boxWidth - 40 }
        }).setOrigin(0.5);

        // 2. 右下角闪烁的小三角提示
        const indicator = this.add.text(boxWidth / 2 - 20, boxHeight / 2 - 20, '▼', {
            fontSize: '16px', color: '#ffffff'
        }).setOrigin(0.5);

        this.tweens.add({
            targets: indicator, y: indicator.y + 5, duration: 400, yoyo: true, repeat: -1
        });

        container.add([bg, msg, indicator]);

        // 3. 动画出场
        this.tweens.add({
            targets: container,
            y: height - boxHeight / 2 - 20,
            duration: 400,
            ease: 'Back.easeOut',
            onComplete: () => {
                // 等待玩家点击屏幕任意位置
                blocker.once('pointerdown', () => {
                    blocker.destroy(); // 玩家点完后，销毁拦截层
                    
                    // 对话框退场动画
                    this.tweens.add({
                        targets: container, y: height + 100, alpha: 0, duration: 300, ease: 'Power2',
                        onComplete: () => {
                            container.destroy();
                            onComplete(); // 触发松鼠逃跑逻辑
                        }
                    });
                });
            }
        });
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

                const effectStr = this.formatEffects(edge.effects);
                if (effectStr !== '') {
                    const text = this.add.text(startX + (endX - startX) * 0.35, startY + (endY - startY) * 0.35, effectStr, {
                        color: '#ffaaaa', fontSize: '12px', fontStyle: 'bold', stroke: '#121a2f', strokeThickness: 4
                    }).setOrigin(0.5);
                    this.edgeTextsMap.set(edgeKey, text);
                }
            }
        }

        for (const node of this.graph) {
            const nodeCircle = this.add.circle(node.x, node.y, 24, 0x000000, 0);
            nodeCircle.setInteractive({ useHandCursor: true });
            this.nodeGraphicsMap.set(node.id, nodeCircle);

            nodeCircle.on('pointerover', () => {
                if (this.isFogOfWar && !this.revealedNodes.has(node.id)) return;
                if (this.registry.get('goalReached') || this.isMoving || this.isGameOver) return;

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

            // const nodeText = this.add.text(node.x, node.y, String(node.id), { color: '#ffffff', fontSize: '16px', fontStyle: 'bold' }).setOrigin(0.5);
            // this.nodeTextsMap.set(node.id, nodeText);

            if (node.nodeEffects && node.nodeEffects.length > 0) {
                const effectStr = this.formatEffects(node.nodeEffects);
                if (effectStr !== '') {
                    const nodeEffectText = this.add.text(node.x + 28, node.y, effectStr, {
                        color: '#aaffcc', fontSize: '12px', fontStyle: 'bold',
                        stroke: '#121a2f', strokeThickness: 4
                    }).setOrigin(0, 0.5);
                    this.nodeEffectTextsMap.set(node.id, nodeEffectText);
                }
            }
        }
    }

    private highlightPossibleMoves(): void {
        if (this.registry.get('goalReached')) return;

        const currentNode = this.graph.find(n => n.id === this.currentNodeId)!;

        if (currentNode.type === NodeType.DEFENDER) {
            const alert = this.add.text(this.puppy.x, this.puppy.y - 40, '❗', { fontSize: '24px', fontStyle: 'bold' }).setOrigin(0.5).setDepth(30);

            // 👇 【核心修复 1】统一重心，让松鼠的脚也踩在石子上！
            // 取消了 y - 10 的偏移，并且使用 setOrigin(0.5, 0.9) 和小狗完全一致！
            const squirrel = this.add.sprite(currentNode.x + 20, currentNode.y, 'squirrel_img')
                .play('squirrel_idle') 
                .setOrigin(0.5, 0.9) //脚丫子贴地透视！
                .setDepth(30)
                .setScale(2)
                .setFlipX(true);

            this.showDialogue("Oh look! A playful squirrel dashed out from the bushes!", () => {
                alert.destroy(); 

                if (this.isMoving || this.isGameOver) {
                    squirrel.destroy();
                    return;
                }

                const targetId = this.pickDefenderMove(currentNode);
                if (targetId !== null) {
                    const targetNode = this.graph.find(n => n.id === targetId)!;
                    
                    // 把松鼠记在“全局变量”里，方便小狗抓它
                    this.activeDefender = squirrel;

                    const edge = currentNode.neighbors.find(e => e.targetId === targetId)!;
                    const path = (edge.pathNodes && edge.pathNodes.length > 0) ? edge.pathNodes : [{ x: targetNode.x, y: targetNode.y }];

                    squirrel.play('squirrel_run'); 
                    this.tweens.killTweensOf(squirrel); 

                    const moveSquirrelStep = (index: number) => {
                        if (index >= path.length) {
                            // 跑完路后不要 destroy！
                            // 让松鼠停在终点，并播放 idle 动画，假装回头看狗
                            squirrel.play('squirrel_idle'); 
                            return;
                        }

                        const targetPoint = path[index];
                        const prevPoint = index > 0 ? path[index - 1] : squirrel;

                        if (targetPoint.x < prevPoint.x - 2) {
                            squirrel.setFlipX(false); 
                        } else if (targetPoint.x > prevPoint.x + 2) {
                            squirrel.setFlipX(true);  
                        }

                        const distance = Phaser.Math.Distance.Between(squirrel.x, squirrel.y, targetPoint.x, targetPoint.y);
                        
                        // 速度设为 500，依然保持松鼠的轻快感
                        const duration = (distance / 100) * 500; 

                        this.tweens.add({
                            targets: squirrel,
                            x: targetPoint.x,
                            y: targetPoint.y,
                            duration: duration,
                            ease: 'Linear',
                            onComplete: () => moveSquirrelStep(index + 1)
                        });
                    };

                    moveSquirrelStep(0);

                    this.time.delayedCall(400, () => {
                        this.moveToNextNode(targetId);
                    });

                } else {
                    squirrel.destroy();
                }
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
                circle.setStrokeStyle(0); // 去掉生硬的边框

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