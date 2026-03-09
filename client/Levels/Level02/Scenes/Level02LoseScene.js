import { drawStar } from '../Helpers/drawStar.js';


export class Level02LoseScene extends Phaser.Scene {
    constructor() {
        super({ key: "Level02LoseScene" });
    }

    init(data) {
        this.finalScore = data.score || 0;
        this.starsCollected = data.stars || 0;
    }

    create() {
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x06101e, 0x06101e, 0x020c18, 0x020c18, 1);
        bg.fillRect(0, 0, 800, 600);

        const panel = this.add.graphics();
        panel.fillStyle(0x000000, 0.65);
        panel.fillRoundedRect(200, 140, 400, 320, 20);
        panel.lineStyle(2, 0xff6666, 0.7);
        panel.strokeRoundedRect(200, 140, 400, 320, 20);

        this.add.text(400, 185, "⏰ TIME'S UP!", {
            fontFamily: "monospace", fontSize: "28px", color: "#ff6666", fontStyle: "bold",
        }).setOrigin(0.5);

        this.add.text(400, 225, "The ocean still needs your help...", {
            fontFamily: "monospace", fontSize: "13px", color: "#aaddff",
        }).setOrigin(0.5);

        // Stars collected
        this.add.text(400, 265, "Stars collected:", {
            fontFamily: "monospace", fontSize: "12px", color: "#ffe066",
        }).setOrigin(0.5);
        for (let i = 0; i < 3; i++) {
            const g = this.add.graphics();
            const filled = i < this.starsCollected;
            this._drawStar(g, 340 + i * 60, 305, 18, filled ? 0xffe066 : 0x334466, filled ? 1 : 0.35);
        }

        this.add.text(400, 345, `SCORE: ${this.finalScore}`, {
            fontFamily: "monospace", fontSize: "20px", color: "#ffffff", fontStyle: "bold",
        }).setOrigin(0.5);

        this.add.text(400, 375,
            `"The ocean is running out of time.\nEvery piece of trash matters."`,
            { fontFamily: "monospace", fontSize: "10px", color: "#7799cc", align: "center" }
        ).setOrigin(0.5);

        // Retry button
        const btn = this.add.graphics();
        btn.fillStyle(0xff6666, 1);
        btn.fillRoundedRect(300, 410, 200, 44, 10);
        this.add.text(400, 432, "TRY AGAIN", {
            fontFamily: "monospace", fontSize: "16px", color: "#ffffff", fontStyle: "bold",
        }).setOrigin(0.5);

        btn.setInteractive(new Phaser.Geom.Rectangle(300, 410, 200, 44), Phaser.Geom.Rectangle.Contains);
        btn.on("pointerover", () => { btn.clear(); btn.fillStyle(0xff9999, 1); btn.fillRoundedRect(300, 410, 200, 44, 10); });
        btn.on("pointerout", () => { btn.clear(); btn.fillStyle(0xff6666, 1); btn.fillRoundedRect(300, 410, 200, 44, 10); });
        btn.on("pointerdown", () => {
            this.scene.stop("Level02LoseScene");
            this.scene.start("Level02GameScene");
        });
    }

    _drawStar(g, cx, cy, r, color, alpha) {
        drawStar(g, cx, cy, r, color, alpha, 0.4);
    }
}