import Phaser from 'phaser';
import { ResourceVector } from '../levels/level-data';

export class HudScene extends Phaser.Scene {
    private statusText!: Phaser.GameObjects.Text;
    private resourceText!: Phaser.GameObjects.Text;
    private previewText!: Phaser.GameObjects.Text;

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

        // listening to data change
        this.registry.events.on('changedata', this.refreshStatus, this);

        this.refreshStatus();
    }

    private refreshStatus(): void {

        const node = this.registry.get('node');
        const goalReached = this.registry.get('goalReached');
        const goalText = goalReached ? ' | Home reached!' : '';

        if (node !== undefined) {
            this.statusText.setText(`Node: ${node}${goalText}`);
        }

        // show resources
        const resources = this.registry.get('resources') as ResourceVector;
        if (resources) {
            this.resourceText.setText(`Time: ${resources.time}  |  Stamina: ${resources.stamina}  |  Bones: ${resources.bones}`);
        }

        // show preview
        const preview = this.registry.get('preview') as ResourceVector | null;
        if (preview) {
            this.previewText.setText(`Preview -> Time: ${preview.time}  |  Stamina: ${preview.stamina}  |  Bones: ${preview.bones}`);
        } else {

            this.previewText.setText('');
        }
    }
}