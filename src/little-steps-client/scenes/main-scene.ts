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

        this.puppy = this.add.sprite(start.x, start.y, 'puppy_img');
        this.puppy.setScale(0.2);
        this.puppy.setDepth(10);

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

                if (this.isFogOfWar) {
                    this.revealEdgesFrom(targetNodeId, true);
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
                graphics.strokePath();

                const arrowX = startX + (endX - startX) * 0.65;
                const arrowY = startY + (endY - startY) * 0.65;
                graphics.fillStyle(0x87a1ff, 0.9);
                const arrowSize = 10;
                graphics.fillTriangle(
                    arrowX + Math.cos(angle) * arrowSize, arrowY + Math.sin(angle) * arrowSize,
                    arrowX + Math.cos(angle + Math.PI * 0.8) * arrowSize, arrowY + Math.sin(angle + Math.PI * 0.8) * arrowSize,
                    arrowX + Math.cos(angle - Math.PI * 0.8) * arrowSize, arrowY + Math.sin(angle - Math.PI * 0.8) * arrowSize
                );

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
            let fill = 0x5e70b5;
            if (node.type === NodeType.START) fill = 0x53d98a;
            if (node.type === NodeType.GOAL) fill = 0xff4d4d;
            if (node.type === NodeType.DEFENDER) fill = 0x9b59b6;

            const nodeCircle = this.add.circle(node.x, node.y, 24, fill);
            nodeCircle.setStrokeStyle(2, 0xffffff, 0.5);
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