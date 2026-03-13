import Phaser from 'phaser';
import { LEVELS } from '../levels/index';
import { applyEffects, ResourceVector, ResourceEffect, NodeType, LevelData, GraphNode } from '../levels/level-data';

export class MainScene extends Phaser.Scene {
    private level!: LevelData;
    private graph!: GraphNode[];

    private puppy!: Phaser.GameObjects.Sprite;
    private currentNodeId!: number;
    private isMoving = false;
    private nodeGraphicsMap: Map<number, Phaser.GameObjects.Arc> = new Map();
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
        this.nodeGraphicsMap.clear();
    }

    preload(): void {
        this.load.image('puppy_img', 'assets/puppy.png');
    }

    create(): void {
        this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x121a2f).setOrigin(0, 0);

        this.currentResources = { ...this.level.initialResources };
        this.registry.set('resources', this.currentResources);
        this.registry.set('preview', null);
        this.registry.set('goalReached', false);
        this.registry.set('node', this.currentNodeId);

        this.scene.launch('HudScene');

        this.drawGraph();
        
        this.add.text(18, 600, `Level: ${this.level.title}`, { color: '#f6f8ff', fontSize: '14px' });

        const start = this.graph.find(n => n.id === this.currentNodeId)!;

        this.puppy = this.add.sprite(start.x, start.y, 'puppy_img');
        this.puppy.setScale(0.2);
        this.puppy.setDepth(10);

        this.registry.set('nodeType', start.type);

        this.highlightPossibleMoves();
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

        const target = this.graph.find(n => n.id === targetNodeId)!;

        this.tweens.add({
            targets: this.puppy,
            x: target.x,
            y: target.y,
            duration: 600,
            ease: 'Power2',
            onComplete: () => {
                this.currentNodeId = targetNodeId;
                this.registry.set('node', this.currentNodeId);
                this.registry.set('nodeType', target.type);

                if (target.nodeEffects && target.nodeEffects.length > 0) {
                    this.currentResources = applyEffects(this.currentResources, target.nodeEffects, this.level.maxResources);
                    this.registry.set('resources', this.currentResources);
                }

                this.isMoving = false;

                if (this.currentNodeId === this.level.goalNodeId) {
                    this.registry.set('goalReached', true);
                    this.highlightPossibleMoves();
                } else {
                    const autoMoved = this.checkAutoMove();
                    if (!autoMoved) {
                        this.highlightPossibleMoves();
                    }
                }
            }
        });
    }

    private checkAutoMove(): boolean {
        const currentNode = this.graph.find(n => n.id === this.currentNodeId)!;
        
        if (currentNode.type === NodeType.DEFENDER && currentNode.neighbors.length > 0) {
            const edge = currentNode.neighbors[Math.floor(Math.random() * currentNode.neighbors.length)];
            
            this.time.delayedCall(300, () => {
                this.isMoving = false;
                this.moveToNextNode(edge.targetId);
            });
            return true;
        }
        return false;
    }

    private drawGraph(): void {
        const edgeGraphics = this.add.graphics();

        for (const node of this.graph) {
            for (const edge of node.neighbors) {
                const neighbor = this.graph.find(n => n.id === edge.targetId)!;
                const angle = Phaser.Math.Angle.Between(node.x, node.y, neighbor.x, neighbor.y);
                const offset = 12;

                const startX = node.x + Math.cos(angle - Math.PI / 2) * offset;
                const startY = node.y + Math.sin(angle - Math.PI / 2) * offset;
                const endX = neighbor.x + Math.cos(angle - Math.PI / 2) * offset;
                const endY = neighbor.y + Math.sin(angle - Math.PI / 2) * offset;

                edgeGraphics.lineStyle(4, 0x87a1ff, 0.6);
                edgeGraphics.beginPath();
                edgeGraphics.moveTo(startX, startY);
                edgeGraphics.lineTo(endX, endY);
                edgeGraphics.strokePath();

                const arrowX = startX + (endX - startX) * 0.65;
                const arrowY = startY + (endY - startY) * 0.65;
                edgeGraphics.fillStyle(0x87a1ff, 0.9);
                const arrowSize = 10;
                edgeGraphics.fillTriangle(
                    arrowX + Math.cos(angle) * arrowSize, arrowY + Math.sin(angle) * arrowSize,
                    arrowX + Math.cos(angle + Math.PI * 0.8) * arrowSize, arrowY + Math.sin(angle + Math.PI * 0.8) * arrowSize,
                    arrowX + Math.cos(angle - Math.PI * 0.8) * arrowSize, arrowY + Math.sin(angle - Math.PI * 0.8) * arrowSize
                );

                const effectStr = this.formatEffects(edge.effects);
                if (effectStr !== '') {
                    this.add.text(startX + (endX - startX) * 0.35, startY + (endY - startY) * 0.35, effectStr, {
                        color: '#ffaaaa', fontSize: '12px', fontStyle: 'bold', stroke: '#121a2f', strokeThickness: 4
                    }).setOrigin(0.5);
                }
            }
        }

        for (const node of this.graph) {
            let fill = 0x5e70b5;
            if (node.type === NodeType.START) fill = 0x53d98a;
            if (node.type === NodeType.GOAL) fill = 0xff4d4d;
            if (node.type === NodeType.DEFENDER) fill = 0x9b59b6;

            const nodeCircle = this.add.circle(node.x, node.y, 24, fill);
            nodeCircle.setStrokeStyle(2, 0xffffff, 0.5);
            nodeCircle.setInteractive({ useHandCursor: true });
            this.nodeGraphicsMap.set(node.id, nodeCircle);

            nodeCircle.on('pointerover', () => {
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
            nodeCircle.on('pointerdown', () => this.moveToNextNode(node.id));

            this.add.text(node.x, node.y, String(node.id), { color: '#ffffff', fontSize: '16px', fontStyle: 'bold' }).setOrigin(0.5);
        }
        this.highlightPossibleMoves();
    }

    private highlightPossibleMoves(): void {
        const currentNode = this.graph.find(n => n.id === this.currentNodeId)!;

        this.nodeGraphicsMap.forEach((circle, id) => {
            const nodeData = this.graph.find(n => n.id === id)!;
            let defaultColor = 0x5e70b5;
            if (nodeData.type === NodeType.START) defaultColor = 0x53d98a;
            if (nodeData.type === NodeType.GOAL) defaultColor = 0xff4d4d;
            if (nodeData.type === NodeType.DEFENDER) defaultColor = 0x9b59b6;
            circle.setFillStyle(defaultColor);
            circle.setStrokeStyle(0);
        });

        if (this.registry.get('goalReached')) return;

        currentNode.neighbors.forEach(edge => {
            const circle = this.nodeGraphicsMap.get(edge.targetId);
            if (circle) {
                const nextResources = applyEffects(this.currentResources, edge.effects, this.level.maxResources);
                const isAffordable = nextResources.time >= 0 && nextResources.stamina >= 0;
                if (isAffordable) {
                    circle.setFillStyle(0xffffff);
                    circle.setStrokeStyle(4, 0xf8c146);
                } else {
                    circle.setFillStyle(0xffcccc);
                    circle.setStrokeStyle(4, 0xff0000);
                }
            }
        });
    }
}