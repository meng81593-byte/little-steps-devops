export class HudScene extends Phaser.Scene {
    private statusText!: Phaser.GameObjects.Text;

    constructor() {
        super('HudScene');
    }

    create(): void {
        this.statusText = this.add.text(18, 18, '', {
            color: '#f6f8ff',
            fontSize: '20px'
        });

        this.add.text(18, 56, 'SPACE: move along first outgoing edge', {
            color: '#c8d3ff',
            fontSize: '14px'
        });

        this.registry.events.on('changedata', this.refreshStatus, this);
        this.refreshStatus();
    }

    private refreshStatus(): void {
        const node = this.registry.get('node');
        const goalReached = this.registry.get('goalReached');

        const goalText = goalReached ? ' | Home reached!' : '';
        this.statusText.setText(`Node: ${node}${goalText}`);
    }
}
