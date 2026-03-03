import { LEVELS } from '../levels/level-data';

export class MainScene extends Phaser.Scene {
    private readonly level = LEVELS[0];
    private readonly graph = this.level.nodes;

    //change Arc to Sprite
    private puppy!: Phaser.GameObjects.Sprite; 
    private currentNodeId = this.level.startNodeId;
    
    //add a lock to avoide player click other places when dog is moving 
    private isMoving = false;

    private nodeGraphicsMap: Map<number, Phaser.GameObjects.Arc> = new Map();

    constructor() {
        super('MainScene');
    }

    preload():void {
        this.load.image('puppy_img','assets/puppy.png')
    }

    create(): void {
        this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x121a2f).setOrigin(0, 0);
        this.drawGraph();
        this.add.text(18, 600, `Level: ${this.level.title}`, {
            color: '#f6f8ff',
            fontSize: '14px'
        });

        const start = this.graph[this.currentNodeId];
        
        //change yellow dot to puuppy image
        this.puppy = this.add.sprite(start.x, start.y,'puppy_img');
        this.puppy.setScale(0.2);
        this.registry.set('node', this.currentNodeId);
        this.registry.set('goalReached', false);

    }

    private moveToNextNode(targetNodeId:number ): void {
        if (this.isMoving) return;//if pupppy is moving ,ignore the other click 
              
        const currentNode = this.graph[this.currentNodeId];
        //check the click whether is the neighbor of the current location  
        if (!currentNode.neighbors.includes(targetNodeId)) {
            console.log("too far! Puppy can't be there!")    
            return;
        }

        this.isMoving = true; // lock
        const target = this.graph[targetNodeId];

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
                this.isMoving = false; // unlock

                //puppy arrive home?
                if(this.currentNodeId === this.level.goalNodeId){
                    this.registry.set('goalReached',true);
                    this.isMoving = false;
                    this.highlightPossibleMoves();//arrive destination and clear every light
                }else {
                    const autoMoved = this.checkAutoMove();
                    if (!autoMoved) {
                    this.isMoving = false;
                    // if there is no automatic movement , update highlightPossibleNode
                    this.highlightPossibleMoves();
                    }   
                }
            }
        });
    }

    //defender Node
    private checkAutoMove(): boolean {
        const currentNode = this.graph[this.currentNodeId];
        
        // define a Defender Node with exactly ONE neighbor.
        // Because the player has no choice, the game just moves for them.
        if (currentNode.neighbors.length === 1 && currentNode.id !== this.level.goalNodeId) {
            
            const nextNodeId = currentNode.neighbors[0];
            console.log(`Auto moving to Node ${nextNodeId}...`);
             
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
         
            const nodeCircle = this.add.circle(node.x, node.y, 24, fill);
           
            nodeCircle.setInteractive(); // allow mouse click
            this.nodeGraphicsMap.set(node.id, nodeCircle);//to change color

            //when player click this circle ,then move
            nodeCircle.on('pointerdown', () => {
                this.moveToNextNode(node.id);
            });
      
            this.add.text(node.x - 5, node.y - 8, String(node.id), {
                color: '#f6f8ff',
                fontSize: '16px'
            
            });
        }
        this.highlightPossibleMoves();
    }


    private highlightPossibleMoves(): void {
    const currentNode = this.graph[this.currentNodeId];

    // reset every node color 
    this.nodeGraphicsMap.forEach((circle, id) => {
        const defaultColor = id === this.level.goalNodeId ? 0x53d98a : 0x5e70b5;
        circle.setFillStyle(defaultColor);
        circle.setStrokeStyle(0); 
    });

    // make neighbors node lighten
    currentNode.neighbors.forEach(neighborId => {
        const circle = this.nodeGraphicsMap.get(neighborId);
        if (circle) {
            circle.setFillStyle(0xffffff); 
            circle.setStrokeStyle(4, 0xf8c146); 
        }
    });
}
}
