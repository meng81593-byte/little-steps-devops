import { LEVELS } from '../levels/level-data';

export class MainScene extends Phaser.Scene {
    private readonly level = LEVELS[0];
    private readonly graph = this.level.nodes;

    private puppy!: Phaser.GameObjects.Arc;
    private currentNodeId = this.level.startNodeId;

    constructor() {
        super('MainScene');
    }

    create(): void {
        this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x121a2f).setOrigin(0, 0);
        this.drawGraph();
        this.add.text(18, 600, `Level: ${this.level.title}`, {
            color: '#f6f8ff',
            fontSize: '14px'
        });

        const start = this.graph[this.currentNodeId];
        this.puppy = this.add.circle(start.x, start.y, 18, 0xf8c146);

        this.registry.set('node', this.currentNodeId);
        this.registry.set('goalReached', false);

        this.input.keyboard?.on('keydown-SPACE', () => this.moveToNextNode());
    }

    private moveToNextNode(): void {
        const currentNode = this.graph[this.currentNodeId];
        if (currentNode.neighbors.length === 0) {
            this.registry.set('goalReached', true);
            return;
        }

        const nextNodeId = currentNode.neighbors[0];
        this.currentNodeId = nextNodeId;

        const target = this.graph[nextNodeId];
        this.puppy.setPosition(target.x, target.y);

        this.registry.set('node', this.currentNodeId);

        if (this.currentNodeId === this.level.goalNodeId) {
            this.registry.set('goalReached', true);
        }
    }

    private drawGraph(): void {
        const edgeGraphics = this.add.graphics();
        const nodeGraphics = this.add.graphics();

        edgeGraphics.lineStyle(4, 0x87a1ff, 0.9);
        for (const node of this.graph) {
            for (const neighborId of node.neighbors) {
                const neighbor = this.graph[neighborId];
                edgeGraphics.beginPath();
                edgeGraphics.moveTo(node.x, node.y);
                edgeGraphics.lineTo(neighbor.x, neighbor.y);
                edgeGraphics.strokePath();
            }
        }

        for (const node of this.graph) {
            const fill = node.id === this.level.goalNodeId ? 0x53d98a : 0x5e70b5;
            nodeGraphics.fillStyle(fill, 1);
            nodeGraphics.fillCircle(node.x, node.y, 24);
            this.add.text(node.x - 5, node.y - 8, String(node.id), {
                color: '#f6f8ff',
                fontSize: '16px'
            });
        }
    }
}
