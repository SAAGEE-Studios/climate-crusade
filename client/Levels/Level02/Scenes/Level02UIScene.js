// Helper function to replace the @/components import
function drawStar(graphics, x, y, radius, color, alpha) {
    graphics.fillStyle(color, alpha);
    // Placeholder simple star drawing (replace with your complex drawStar logic if needed)
    graphics.fillCircle(x, y, radius);
}

export class Level02UIScene extends Phaser.Scene {
    constructor() {
        super({ key: "Level02UIScene" });
    }

    init(data) {
        this.gameScene = data.gameScene;
    }

    create() {
        // Background panel top-left
        const panel = this.add.graphics();
        panel.fillStyle(0x000000, 0.45);
        panel.fillRoundedRect(10, 10, 240, 80, 10);

        // SDG14 badge
        const badge = this.add.graphics();
        badge.fillStyle(0x1565c0, 0.9);
        badge.fillRoundedRect(620, 10, 170, 50, 8);
        this.add.text(705, 35, "🌊 SDG 14 · Life Below Water", {
            fontFamily: "monospace",
            fontSize: "9px",
            color: "#ffffff",
        }).setOrigin(0.5);

        // Score
        this.scoreLabel = this.add.text(20, 18, "SCORE", {
            fontFamily: "monospace", fontSize: "10px", color: "#4ecdc4",
        });
        this.scoreText = this.add.text(20, 32, "0", {
            fontFamily: "monospace", fontSize: "22px", color: "#ffffff", fontStyle: "bold",
        });

        // Timer
        this.timerLabel = this.add.text(130, 18, "TIME", {
            fontFamily: "monospace", fontSize: "10px", color: "#4ecdc4",
        });
        this.timerText = this.add.text(130, 32, "2:00", {
            fontFamily: "monospace", fontSize: "22px", color: "#ffffff", fontStyle: "bold",
        });

        // Stars row
        this.starIcons = [];
        this.add.text(20, 64, "STARS:", {
            fontFamily: "monospace", fontSize: "11px", color: "#ffe066",
        });
        for (let i = 0; i < 3; i++) {
            const s = this.add.graphics();
            this._drawStarIcon(s, 0, 0, 8, false);
            s.setPosition(88 + i * 24, 72);
            this.starIcons.push(s);
        }

        // Listen to game events
        this.gameScene.events.on("scoreUpdate", (score) => {
            this.scoreText.setText(String(score));
        });
        this.gameScene.events.on("timeUpdate", (t) => {
            const m = Math.floor(t / 60);
            const s = t % 60;
            this.timerText.setText(`${m}:${s.toString().padStart(2, "0")}`);
            if (t <= 30) this.timerText.setColor("#ff6666");
            else if (t <= 60) this.timerText.setColor("#ffaa44");
        });
        this.gameScene.events.on("starUpdate", (count) => {
            for (let i = 0; i < 3; i++) {
                this.starIcons[i].clear();
                this._drawStarIcon(this.starIcons[i], 0, 0, 8, i < count);
            }
        });

        // Hint
        this.add.text(400, 588, "Collect ★ stars to clear the level • Clean the ocean! 🌊", {
            fontFamily: "monospace", fontSize: "10px", color: "#aaccff", alpha: 0.7,
        }).setOrigin(0.5).setAlpha(0.7);
    }

    _drawStarIcon(g, cx, cy, r, filled) {
        drawStar(g, cx, cy, r, filled ? 0xffe066 : 0x334466, 1, filled ? 1 : 0.4);
    }
}