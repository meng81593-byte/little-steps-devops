import Phaser from 'phaser';
import { LEVELS } from '../levels/index';
import { applyEffects, ResourceVector, ResourceEffect, NodeType, LevelData, GraphNode } from '../levels/level-data';

export class MainScene extends Phaser.Scene {
    private level!: LevelData;
    private graph!: GraphNode[];

    private puppy!: Phaser.GameObjects.Sprite;
    private currentNodeId!: number;
    private isMoving = false;
    
    private isFogOfWar = false;
    private revealedNodes: Set<number> = new Set();
    
    private nodeGraphicsMap: Map<number, Phaser.GameObjects.Arc> = new Map();
    private nodeTextsMap: Map<number, Phaser.GameObjects.Text> = new Map();
    private edgeGraphicsMap: Map<string, Phaser.GameObjects.Graphics> = new Map();
    private edgeTextsMap: Map<string, Phaser.GameObjects.Text> = new Map();
    
    private currentResources!: ResourceVector;

    constructor() {
        super('MainScene');
    }

    init(data: { levelIndex: number }): void {
        const index = data.levelIndex ?? 0;
        this.level = LEVELS[index];
        this.graph = this.level.nodes;
        this.currentNodeId = this.level.startNodeId;
        this.isMoving = false;
        
        this.isFogOfWar = this.level.id === 'gradual-reveal';
        
        this.revealedNodes.clear();
        this.nodeGraphicsMap.clear();
        this.nodeTextsMap.clear();
        this.edgeGraphicsMap.clear();
        this.edgeTextsMap.clear();
    }

    preload(): void {
        this.load.spritesheet('puppy_run', 'assets/Splayer_strip4.png', { 
            frameWidth: 64, // 注意：如果你的狗出现残影或者被劈成两半，记得把这里改回 32！
            frameHeight: 64 
        });
        this.load.image('town_tiles', 'assets/tilemap_packed.png');
        this.load.tilemapTiledJSON('map', 'assets/map.json');
    }

    create(): void {
        const map = this.make.tilemap({ key: 'map' });
        const tileset = map.addTilesetImage('town_tiles', 'town_tiles'); 
        
        if (tileset) {
            const bgLayer = map.createLayer('background', tileset, 0, 0);
            const mgLayer = map.createLayer('midground', tileset, 0, 0);
            const fgLayer = map.createLayer('foreground', tileset, 0, 0); 
            if (bgLayer) {
                 bgLayer.setScale(2.5);
            }
            if (mgLayer) {
                 mgLayer.setScale(2.5);
            }
            if (fgLayer) {
                 fgLayer.setScale(2.5);
            }
        }
        
        this.currentResources = { ...this.level.initialResources };
        this.registry.set('resources', this.currentResources);
        this.registry.set('preview', null);
        this.registry.set('goalReached', false);
        this.registry.set('node', this.currentNodeId);

        this.scene.launch('HudScene');

        this.drawGraph();
        
        if (this.isFogOfWar) {
            this.nodeGraphicsMap.forEach(c => c.setAlpha(0));
            this.nodeTextsMap.forEach(t => t.setAlpha(0));
            this.edgeGraphicsMap.forEach(g => g.setAlpha(0));
            this.edgeTextsMap.forEach(t => t.setAlpha(0));

            this.revealNode(this.currentNodeId, false);
            this.revealEdgesFrom(this.currentNodeId, false);
        }

        this.add.text(18, 600, `Level: ${this.level.title}`, { color: '#f6f8ff', fontSize: '14px' });

        const start = this.graph.find(n => n.id === this.currentNodeId)!;

        this.puppy = this.add.sprite(start.x, start.y, 'puppy_run');
        this.puppy.setScale(1.5); 
        this.puppy.setDepth(10);

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
        
        this.registry.set('nodeType', start.type);
        this.highlightPossibleMoves();
    }

    private revealNode(nodeId: number, animate: boolean): void {
        if (!this.revealedNodes.has(nodeId)) {
            this.revealedNodes.add(nodeId);
            const circle = this.nodeGraphicsMap.get(nodeId);
            const txt = this.nodeTextsMap.get(nodeId);
            
            if (circle) {
                if (animate) {
                    const targets = txt ? [circle, txt] : [circle];
                    this.tweens.add({ targets, alpha: 1, duration: 600 });
                } else {
                    circle.setAlpha(1);
                    if (txt) txt.setAlpha(1);
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
        if (this.isMoving) return;

        const currentNode = this.graph.find(n => n.id === this.currentNodeId)!;
        const edge = currentNode.neighbors.find(e => e.targetId === targetNodeId);

        if (!edge) {
            console.log("too far! Puppy can't be there!");
            return;
        }

        const nextResources = applyEffects(this.currentResources, edge.effects, this.level.maxResources);

        if (nextResources.time < 0 || nextResources.stamina < 0) {
            console.log("Not enough resources to move!");
            this.cameras.main.shake(150, 0.005);
            return;
        }

        if (targetNodeId === this.level.goalNodeId && nextResources.bones < 1) {
            console.log("You must collect a bone to go home!");
            this.cameras.main.shake(200, 0.01);
            return;
        }

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

    private moveAlongPath(path: {x: number, y: number}[], targetNode: GraphNode): void {
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
        }

        if (this.isFogOfWar) {
            this.revealEdgesFrom(targetNodeId, true);
        }

        this.isMoving = false; 

        if (this.currentNodeId === this.level.goalNodeId) {
            this.registry.set('goalReached', true);
            this.highlightPossibleMoves();
        } else {
            this.highlightPossibleMoves();
        }
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

                // const arrowX = startX + (endX - startX) * 0.65;
                // const arrowY = startY + (endY - startY) * 0.65;
                // graphics.fillStyle(0x87a1ff, 0.9);
                // const arrowSize = 10;
                // graphics.fillTriangle(
                //     arrowX + Math.cos(angle) * arrowSize, arrowY + Math.sin(angle) * arrowSize,
                //     arrowX + Math.cos(angle + Math.PI * 0.8) * arrowSize, arrowY + Math.sin(angle + Math.PI * 0.8) * arrowSize,
                //     arrowX + Math.cos(angle - Math.PI * 0.8) * arrowSize, arrowY + Math.sin(angle - Math.PI * 0.8) * arrowSize
                // );

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
            
            // nodeCircle.setStrokeStyle(2, 0xffffff, 0.5); // 这行记得注释掉或删掉
            nodeCircle.setInteractive({ useHandCursor: true });
            
            this.nodeGraphicsMap.set(node.id, nodeCircle);

            nodeCircle.on('pointerover', () => {
                if (this.isFogOfWar && !this.revealedNodes.has(node.id)) return;
                if (this.registry.get('goalReached') || this.isMoving) return;
                
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

            const nodeText = this.add.text(node.x, node.y, String(node.id), { color: '#ffffff', fontSize: '16px', fontStyle: 'bold' }).setOrigin(0.5);
            this.nodeTextsMap.set(node.id, nodeText);
        }
    }

    private highlightPossibleMoves(): void {
        const currentNode = this.graph.find(n => n.id === this.currentNodeId)!;

        this.nodeGraphicsMap.forEach((circle, id) => {
            if (this.isFogOfWar && !this.revealedNodes.has(id)) return;
                return;
        });

        if (this.registry.get('goalReached')) return;

        currentNode.neighbors.forEach(edge => {
            const circle = this.nodeGraphicsMap.get(edge.targetId);
            if (circle) {
                const nextResources = applyEffects(this.currentResources, edge.effects, this.level.maxResources);
                const isAffordable = nextResources.time >= 0 && nextResources.stamina >= 0;
                
            }
        });
    }
}