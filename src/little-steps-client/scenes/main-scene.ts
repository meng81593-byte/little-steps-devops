import Phaser from 'phaser';
import { LEVELS, applyEffects, ResourceVector, ResourceEffect } from '../levels/level-data';

export class MainScene extends Phaser.Scene {
    private readonly level = LEVELS[0];
    private readonly graph = this.level.nodes;

    //change Arc to Sprite
    private puppy!: Phaser.GameObjects.Sprite;
    private currentNodeId = this.level.startNodeId;

    //add a lock to avoide player click other places when dog is moving 
    private isMoving = false;

    private nodeGraphicsMap: Map<number, Phaser.GameObjects.Arc> = new Map();
    private currentResources!: ResourceVector;

    constructor() {
        super('MainScene');
    }

    preload(): void {
        this.load.image('puppy_img', 'assets/puppy.png');
    }

    create(): void {
        this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x121a2f).setOrigin(0, 0);

        this.currentResources = { ...this.level.initialResources };
        this.registry.set('resources', this.currentResources);
        this.registry.set('preview', null);

        this.scene.launch('HudScene');

        this.drawGraph();
        this.add.text(18, 600, `Level: ${this.level.title}`, { color: '#f6f8ff', fontSize: '14px' });

        const start = this.graph.find(n => n.id === this.currentNodeId)!;

        //change yellow dot to puuppy image
        this.puppy = this.add.sprite(start.x, start.y, 'puppy_img');
        this.puppy.setScale(0.2);
        this.registry.set('node', this.currentNodeId);
        this.registry.set('goalReached', false);
    }

    // format resources effect to texts
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
        if (this.isMoving) return; //if pupppy is moving ,ignore the other click 

        const currentNode = this.graph.find(n => n.id === this.currentNodeId)!;
        const edge = currentNode.neighbors.find(e => e.targetId === targetNodeId);

        //check the click whether is the neighbor of the current location 
        if (!edge) {
            console.log("too far! Puppy can't be there!");
            return;
        }

        const nextResources = applyEffects(this.currentResources, edge.effects, this.level.maxResources);

        // check if resources enough
        if (nextResources.time < 0 || nextResources.stamina < 0) {
            console.log("Not enough resources to move!");
            this.cameras.main.shake(150, 0.005);
            return;
        }

        // check bones before destination
        if (targetNodeId === this.level.goalNodeId && nextResources.bones < 1) {
            console.log("You must collect a bone to go home!");
            this.cameras.main.shake(200, 0.01);

            const text = this.add.text(this.scale.width / 2, 100, "Need a Bone to go Home!", {
                color: '#ff0000', fontSize: '24px', fontStyle: 'bold'
            }).setOrigin(0.5);
            this.tweens.add({ targets: text, alpha: 0, y: 50, duration: 1500, onComplete: () => text.destroy() });

            return;
        }

        this.isMoving = true; // lock
        this.currentResources = nextResources;
        this.registry.set('resources', this.currentResources);

        const target = this.graph.find(n => n.id === targetNodeId)!;

        //cartoon tween
        this.tweens.add({
            targets: this.puppy,
            x: target.x,
            y: target.y,
            duration: 600, //movement takes 0.6s 
            ease: 'Power2', // speed curve (quick to slow)
            onComplete: () => {
                //after carttoon, update status 
                this.currentNodeId = targetNodeId;
                this.registry.set('node', this.currentNodeId);

                if (target.nodeEffects && target.nodeEffects.length > 0) {
                    this.currentResources = applyEffects(this.currentResources, target.nodeEffects, this.level.maxResources);
                    this.registry.set('resources', this.currentResources);
                }

                this.isMoving = false; // unlock
                this.highlightPossibleMoves();

                //puppy arrive home?
                if (this.currentNodeId === this.level.goalNodeId) {
                    this.registry.set('goalReached', true);
                    this.highlightPossibleMoves(); //arrive destination and clear every light
                } else {
                    // if there is no automatic movement , update highlightPossibleNode (handled in checkAutoMove now)
                    this.checkAutoMove();
                }
            }
        });
    }

    //defender Node
    private checkAutoMove(): boolean {
        const currentNode = this.graph.find(n => n.id === this.currentNodeId)!;

        // define a Defender Node with exactly ONE neighbor.
        // Because the player has no choice, the game just moves for them.
        if (currentNode.neighbors.length === 1 && currentNode.id !== this.level.goalNodeId) {
            const edge = currentNode.neighbors[0];
            const nextNodeId = edge.targetId;

            // if resources not enough, do not auto move
            const nextResources = applyEffects(this.currentResources, edge.effects, this.level.maxResources);
            if (nextResources.time < 0 || nextResources.stamina < 0) return false;
            if (nextNodeId === this.level.goalNodeId && nextResources.bones < 1) return false;

            // Wait 0.3 seconds so the puppy "pauses" briefly, then force move
            this.time.delayedCall(300, () => {
                this.isMoving = false; // Temporarily unlock so code can move it
                this.moveToNextNode(nextNodeId);
            });
            return true; // Return true because an auto-move is happening!
        }
        return false; // Not a defender node, player must click
    }

    private drawGraph(): void {
        const edgeGraphics = this.add.graphics();

        for (const node of this.graph) {
            for (const edge of node.neighbors) {
                const neighbor = this.graph.find(n => n.id === edge.targetId)!;

                // calculate angle between two nodes
                const angle = Phaser.Math.Angle.Between(node.x, node.y, neighbor.x, neighbor.y);

                const offset = 12; // width 

                const offsetX = Math.cos(angle - Math.PI / 2) * offset;
                const offsetY = Math.sin(angle - Math.PI / 2) * offset;

                // new start and end position
                const startX = node.x + offsetX;
                const startY = node.y + offsetY;
                const endX = neighbor.x + offsetX;
                const endY = neighbor.y + offsetY;

                // draw lines
                edgeGraphics.lineStyle(4, 0x87a1ff, 0.9);
                edgeGraphics.beginPath();
                edgeGraphics.moveTo(startX, startY);
                edgeGraphics.lineTo(endX, endY);
                edgeGraphics.strokePath();

                // draw arrows
                const tArrow = 0.65;
                const arrowX = startX + (endX - startX) * tArrow;
                const arrowY = startY + (endY - startY) * tArrow;

                const arrowSize = 10;
                edgeGraphics.fillStyle(0x87a1ff, 0.9);
                const p1X = arrowX + Math.cos(angle) * arrowSize;
                const p1Y = arrowY + Math.sin(angle) * arrowSize;
                const p2X = arrowX + Math.cos(angle + Math.PI * 0.8) * arrowSize;
                const p2Y = arrowY + Math.sin(angle + Math.PI * 0.8) * arrowSize;
                const p3X = arrowX + Math.cos(angle - Math.PI * 0.8) * arrowSize;
                const p3Y = arrowY + Math.sin(angle - Math.PI * 0.8) * arrowSize;
                edgeGraphics.fillTriangle(p1X, p1Y, p2X, p2Y, p3X, p3Y);

                // resources text
                const tText = 0.35;
                const textX = startX + (endX - startX) * tText;
                const textY = startY + (endY - startY) * tText;

                const effectStr = this.formatEffects(edge.effects);
                if (effectStr !== '') {
                    this.add.text(textX, textY, effectStr, {
                        color: '#ffaaaa',
                        fontSize: '12px',
                        fontStyle: 'bold',
                        align: 'center',
                        stroke: '#121a2f',
                        strokeThickness: 4
                    }).setOrigin(0.5);
                }
            }
        }

        for (const node of this.graph) {
            const fill = node.id === this.level.goalNodeId ? 0x53d98a : 0x5e70b5;
            const nodeCircle = this.add.circle(node.x, node.y, 24, fill);

            nodeCircle.setInteractive(); // allow mouse click
            this.nodeGraphicsMap.set(node.id, nodeCircle); //to change color

            nodeCircle.on('pointerover', () => {
                // if goal reached, stop reviewing
                if (this.registry.get('goalReached')) return;

                const currentNode = this.graph.find(n => n.id === this.currentNodeId)!;
                const edge = currentNode.neighbors.find(e => e.targetId === node.id);

                if (edge && !this.isMoving) {
                    let preview = applyEffects(this.currentResources, edge.effects, this.level.maxResources);
                    if (node.nodeEffects) {
                        preview = applyEffects(preview, node.nodeEffects, this.level.maxResources);
                    }
                    this.registry.set('preview', preview);
                }
            });

            nodeCircle.on('pointerout', () => {
                this.registry.set('preview', null);
            });

            //when player click this circle ,then move
            nodeCircle.on('pointerdown', () => {
                if (this.registry.get('goalReached')) return;

                this.moveToNextNode(node.id);
            });

            this.add.text(node.x, node.y, String(node.id), {
                color: '#ffffff',
                fontSize: '16px',
                fontStyle: 'bold',
                stroke: '#121a2f',
                strokeThickness: 4
            }).setOrigin(0.5);

            const nodeEffectStr = this.formatEffects(node.nodeEffects);
            if (nodeEffectStr !== '') {
                this.add.text(node.x, node.y + 32, nodeEffectStr, {
                    color: '#f8c146',
                    fontSize: '12px',
                    fontStyle: 'bold',
                    align: 'center',
                    stroke: '#121a2f',
                    strokeThickness: 4
                }).setOrigin(0.5);
            }
        }
        this.highlightPossibleMoves();
    }

    private highlightPossibleMoves(): void {
        const currentNode = this.graph.find(n => n.id === this.currentNodeId)!;

        // reset every node color 
        this.nodeGraphicsMap.forEach((circle, id) => {
            const defaultColor = id === this.level.goalNodeId ? 0x53d98a : 0x5e70b5;
            circle.setFillStyle(defaultColor);
            circle.setStrokeStyle(0);
        });

        if (this.registry.get('goalReached')) return;

        // make neighbors node lighten
        currentNode.neighbors.forEach(edge => {
            const circle = this.nodeGraphicsMap.get(edge.targetId);
            if (circle) {

                const nextResources = applyEffects(this.currentResources, edge.effects, this.level.maxResources);

                const isAffordable = nextResources.time >= 0 && nextResources.stamina >= 0;
                const meetsGoalCondition = edge.targetId === this.level.goalNodeId ? nextResources.bones >= 1 : true;

                if (isAffordable && meetsGoalCondition) {
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