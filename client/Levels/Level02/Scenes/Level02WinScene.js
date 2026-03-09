import { drawStar } from '../Helpers/drawStar.js';


export class Level02WinScene extends Phaser.Scene {
    constructor() {
        super({ key: "Level02WinScene" });
    }

    init(data) {
        this.finalScore = data.score || 0;
        this.starsCollected = data.stars || 0;
        this.timeLeft = data.timeLeft || 0;
    }

    create() {
        // Ocean backdrop
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x0d5a8c, 0x0d5a8c, 0x020c18, 0x020c18, 1);
        bg.fillRect(0, 0, 800, 600);

        // Glow panel
        const panel = this.add.graphics();
        panel.fillStyle(0x000000, 0.6);
        panel.fillRoundedRect(200, 130, 400, 340, 20);
        panel.lineStyle(2, 0x4ecdc4, 0.8);
        panel.strokeRoundedRect(200, 130, 400, 340, 20);

        this.add.text(400, 175, "🌊 OCEAN CLEARED!", {
            fontFamily: "monospace", fontSize: "28px", color: "#4ecdc4", fontStyle: "bold",
        }).setOrigin(0.5);

        this.add.text(400, 220, "You helped save Life Below Water", {
            fontFamily: "monospace", fontSize: "13px", color: "#aaddff",
        }).setOrigin(0.5);

        // SDG14 quote
        const quote = this.add.text(400, 260,
            '"Conserve and sustainably use the oceans,\nseas and marine resources."',
            { fontFamily: "monospace", fontSize: "11px", color: "#88ccff", align: "center" }
        ).setOrigin(0.5);

        // Stars
        for (let i = 0; i < 3; i++) {
            const g = this.add.graphics();
            const filled = i < this.starsCollected;
            this._drawStar(g, 340 + i * 60, 315, 20, filled ? 0xffe066 : 0x334466, filled ? 1 : 0.4);
            if (filled) {
                this.tweens.add({
                    targets: g,
                    scaleX: 1.2, scaleY: 1.2,
                    yoyo: true, repeat: -1,
                    duration: 700 + i * 150,
                    ease: "Sine.easeInOut",
                });
            }
        }

        this.add.text(400, 360, `SCORE: ${this.finalScore}`, {
            fontFamily: "monospace", fontSize: "20px", color: "#ffffff", fontStyle: "bold",
        }).setOrigin(0.5);

        const m = Math.floor(this.timeLeft / 60);
        const s = this.timeLeft % 60;
        this.add.text(400, 390, `Time remaining: ${m}:${s.toString().padStart(2, "0")}`, {
            fontFamily: "monospace", fontSize: "13px", color: "#aaddff",
        }).setOrigin(0.5);

        // Replay button
        const btn = this.add.graphics();
        btn.fillStyle(0x4ecdc4, 1);
        btn.fillRoundedRect(300, 420, 200, 44, 10);
        const btnText = this.add.text(400, 442, "PLAY AGAIN", {
            fontFamily: "monospace", fontSize: "16px", color: "#001122", fontStyle: "bold",
        }).setOrigin(0.5);

        btn.setInteractive(new Phaser.Geom.Rectangle(300, 420, 200, 44), Phaser.Geom.Rectangle.Contains);
        btn.on("pointerover", () => { btn.clear(); btn.fillStyle(0x7eede6, 1); btn.fillRoundedRect(300, 420, 200, 44, 10); });
        btn.on("pointerout", () => { btn.clear(); btn.fillStyle(0x4ecdc4, 1); btn.fillRoundedRect(300, 420, 200, 44, 10); });
        btn.on("pointerdown", () => {
            this.scene.stop("Level02WinScene");
            this.scene.start("Level02GameScene");
        });

        // Floating particles
        this._spawnCelebration();
    }

    _drawStar(g, cx, cy, r, color, alpha) {
        drawStar(g, cx, cy, r, color, alpha, 0.5);
    }

    _spawnCelebration() {
        const colors = [0x4ecdc4, 0xffe066, 0xff6b9d, 0x88ccff, 0xaaffaa];
        for (let i = 0; i < 30; i++) {
            const p = this.add.graphics().setDepth(20);
            p.fillStyle(Phaser.Math.RND.pick(colors), 0.9);
            p.fillCircle(0, 0, Phaser.Math.Between(3, 7));
            p.setPosition(Phaser.Math.Between(0, 800), Phaser.Math.Between(-50, 0));
            this.tweens.add({
                targets: p,
                y: 700,
                x: `+=${Phaser.Math.Between(-80, 80)}`,
                alpha: 0,
                delay: Phaser.Math.Between(0, 1500),
                duration: Phaser.Math.Between(2000, 4000),
                ease: "Power1",
                repeat: -1,
                repeatDelay: Phaser.Math.Between(500, 2000),
                onRepeat: () => {
                    p.setPosition(Phaser.Math.Between(0, 800), -10);
                    p.setAlpha(0.9);
                },
            });
        }
    }
}