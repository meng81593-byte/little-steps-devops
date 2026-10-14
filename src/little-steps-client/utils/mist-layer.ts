import Phaser from 'phaser';

type Clearing = { x: number; y: number; radius: number; progress: number };

/** Low-resolution continuous mist. Exploration stays clear across later turns. */
export class MistLayer {
    private texture: Phaser.Textures.CanvasTexture;
    private clearings = new Map<string, Clearing>();
    private corridors = new Set<string>();
    private timer: Phaser.Time.TimerEvent;
    private readonly pixel = 4;
    private readonly key: string;

    constructor(private scene: Phaser.Scene, width: number, height: number) {
        this.key = `map-mist-${scene.sys.settings.key}`;
        if (scene.textures.exists(this.key)) scene.textures.remove(this.key);
        this.texture = scene.textures.createCanvas(this.key, Math.ceil(width / this.pixel), Math.ceil(height / this.pixel))!;
        this.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
        scene.add.image(0, 0, this.key).setOrigin(0).setScale(this.pixel).setDepth(35);
        this.render();
        this.timer = scene.time.addEvent({ delay: 50, loop: true, callback: () => this.render() });
        scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.timer.remove();
            scene.tweens.killTweensOf([...this.clearings.values()]);
            scene.textures.remove(this.key);
        });
    }

    reveal(id: number, x: number, y: number, animate: boolean): void {
        this.addClearing(`node-${id}`, x, y, 112, animate);
        if (!animate) this.render();
    }

    revealPath(from: number, to: number, points: { x: number; y: number }[], animate: boolean): void {
        const key = `${Math.min(from, to)}-${Math.max(from, to)}`;
        if (this.corridors.has(key)) return;
        this.corridors.add(key);
        let travelled = 0;
        for (let i = 1; i < points.length; i++) {
            const a = points[i - 1], b = points[i];
            const distance = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
            const steps = Math.max(1, Math.ceil(distance / 40));
            for (let j = 1; j <= steps; j++) {
                const t = j / steps;
                this.addClearing(`${key}-${i}-${j}`, Phaser.Math.Linear(a.x, b.x, t), Phaser.Math.Linear(a.y, b.y, t), 62, animate, Math.min(300, (travelled + distance * t) * 0.7));
            }
            travelled += distance;
        }
        if (!animate) this.render();
    }

    private addClearing(key: string, x: number, y: number, radius: number, animate: boolean, delay = 0): void {
        if (this.clearings.has(key)) return;
        const clearing = { x, y, radius, progress: animate ? 0 : 1 };
        this.clearings.set(key, clearing);
        if (animate) this.scene.tweens.add({ targets: clearing, progress: 1, duration: 650, delay, ease: 'Sine.easeOut' });
    }

    private render(): void {
        const ctx = this.texture.context;
        const { width, height } = this.texture.canvas;
        const phase = this.scene.time.now / 3200;
        ctx.clearRect(0, 0, width, height);
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(78,104,99,0.94)';
        ctx.fillRect(0, 0, width, height);
        // Muted unexplored ground with irregular overlapping wisps, rather than
        // bright horizontal stripes. Motion is deliberately slower than the puppy.
        for (let layer = 0; layer < 3; layer++) {
            for (let bank = 0; bank < 12; bank++) {
                const seed = bank * 17.31 + layer * 41.7;
                const random = (n: number) => { const v = Math.sin(seed + n * 12.9898) * 43758.5453; return v - Math.floor(v); };
                const span = width + 100;
                const speed = [1.8, -3.1, 4.3][layer];
                const x = ((random(1) * span + phase * speed) % span + span) % span - 50;
                const y = random(2) * (height + 70) - 35 + Math.sin(phase * 0.25 + seed) * 4;
                for (let lobe = 0; lobe < 3; lobe++) {
                    const rx = 26 + random(3 + lobe) * 34;
                    const ry = 16 + random(7 + lobe) * 23;
                    ctx.save();
                    ctx.translate(x + lobe * 13, y + Math.sin(seed + lobe) * 13); ctx.scale(rx, ry);
                    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
                    gradient.addColorStop(0, `rgba(177,193,181,${0.12 + layer * 0.035})`);
                    gradient.addColorStop(0.55, 'rgba(156,178,166,0.07)');
                    gradient.addColorStop(1, 'rgba(156,178,166,0)');
                    ctx.fillStyle = gradient; ctx.fillRect(-1, -1, 2, 2);
                    ctx.restore();
                }
            }
        }
        ctx.globalCompositeOperation = 'destination-out';
        for (const c of this.clearings.values()) {
            if (c.progress <= 0) continue;
            const x = c.x / this.pixel, y = c.y / this.pixel;
            const r = c.radius / this.pixel * (0.65 + c.progress * 0.35);
            // Overlapping asymmetric feathers avoid a hard circular cutout.
            for (let lobe = 0; lobe < 3; lobe++) {
                const angle = lobe * Math.PI * 2 / 3 + c.x * 0.01;
                const ox = Math.cos(angle) * r * 0.24, oy = Math.sin(angle) * r * 0.19;
                const gradient = ctx.createRadialGradient(x + ox, y + oy, r * 0.30, x + ox, y + oy, r);
                gradient.addColorStop(0, `rgba(0,0,0,${c.progress})`);
                gradient.addColorStop(0.45, `rgba(0,0,0,${c.progress * 0.72})`);
                gradient.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = gradient;
                ctx.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
            }
        }
        ctx.globalCompositeOperation = 'source-over';
        this.texture.refresh();
    }
}
