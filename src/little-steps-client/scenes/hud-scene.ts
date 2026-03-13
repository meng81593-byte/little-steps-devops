import Phaser from 'phaser';
import { ResourceVector } from '../levels/level-data';

export class HudScene extends Phaser.Scene {
    private statusText!: Phaser.GameObjects.Text;
    private resourceText!: Phaser.GameObjects.Text;
    private previewText!: Phaser.GameObjects.Text;
    private hintText!: Phaser.GameObjects.Text;

    constructor() {
        super('HudScene');
    }

    create(): void {
        this.statusText = this.add.text(18, 18, '', {
            color: '#f6f8ff',
            fontSize: '20px',
            fontStyle: 'bold'
        });

        this.resourceText = this.add.text(18, 48, '', {
            color: '#53d98a',
            fontSize: '18px'
        });

        this.previewText = this.add.text(18, 76, '', {
            color: '#f8c146',
            fontSize: '16px'
        });

        this.hintText = this.add.text(18, 110, '', {
            color: '#c8d3ff',
            fontSize: '14px'
        });

        const menuBtn = this.add.text(this.scale.width - 120, 20, '🏠 Menu', {
            fontSize: '18px',
            backgroundColor: '#34495e',
            padding: { x: 10, y: 5 }
        })
        .setInteractive({ useHandCursor: true });

        menuBtn.on('pointerdown', () => {
            this.registry.events.off('changedata', this.refreshStatus, this);
            this.scene.stop('MainScene');
            this.scene.start('MenuScene');
        });

        this.registry.events.on('changedata', this.refreshStatus, this);

        this.refreshStatus();
    }

    private refreshStatus(): void {
        const node = this.registry.get('node');
        const goalReached = this.registry.get('goalReached');
        const nodeType = this.registry.get('nodeType');
        
        const goalText = goalReached ? ' | 🎉 Home reached!' : '';

        if (node !== undefined) {
            this.statusText.setText(`Node: ${node}${goalText}`);
        }

        const resources = this.registry.get('resources') as ResourceVector;
        if (resources) {
            this.resourceText.setText(`Time: ${resources.time}  |  Stamina: ${resources.stamina}  |  Bones: ${resources.bones}`);
            
            if (resources.time <= 10 || resources.stamina <= 5) {
                this.resourceText.setColor('#ff4d4d');
            } else {
                this.resourceText.setColor('#53d98a');
            }
        }

        const preview = this.registry.get('preview') as ResourceVector | null;
        if (preview) {
            this.previewText.setText(`Preview -> Time: ${preview.time}  |  Stamina: ${preview.stamina}  |  Bones: ${preview.bones}`);
        } else {
            this.previewText.setText('');
        }

        if (goalReached) {
            this.hintText.setText('Safe at home! Click Menu to play again.').setColor('#53d98a');
        } else if (nodeType === 'defender') {
            this.hintText.setText('⚠️ DEFENDER TURN: Puppy is moving automatically!').setColor('#9b59b6');
        } else {
            this.hintText.setText('Click a highlighted node to move.').setColor('#c8d3ff');
        }
    }

    shutdown(): void {
        this.registry.events.off('changedata', this.refreshStatus, this);
    }
}