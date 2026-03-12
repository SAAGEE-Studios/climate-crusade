import { GameFlowManager } from '../../../Core/GameFlowManager.js';
import { GameState } from '../../../Core/GameState.js';
import {LevelSelectScene} from '../../../LevelSelect/LevelSelectScene.js';

// =========================================================================
// HELPER FUNCTIONS
// =========================================================================

/**
 * Draws a 5-pointed star on a Phaser Graphics object.
 */
function drawStar(g, cx, cy, r, color, alpha, strokeAlpha = 0.6) {
    g.fillStyle(color, alpha);
    g.lineStyle(1.5, 0xffffff, strokeAlpha);
    const pts = [];
    for (let i = 0; i < 5; i++) {
        const a1 = Phaser.Math.DegToRad(-90 + i * 72);
        const a2 = Phaser.Math.DegToRad(-90 + i * 72 + 36);
        pts.push({ x: cx + Math.cos(a1) * r, y: cy + Math.sin(a1) * r });
        pts.push({ x: cx + Math.cos(a2) * (r * 0.45), y: cy + Math.sin(a2) * (r * 0.45) });
    }
    g.fillPoints(pts, true);
    g.strokePoints(pts, true);
}


// =========================================================================
// CONSTANTS
// =========================================================================
export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;
export const WATER_Y = 120;
export const SEAFLOOR_Y = 560;
export const TOTAL_STARS = 3;
export const GAME_DURATION = 120; // seconds
export const MAX_ROPE_LENGTH = 520;
export const HOOK_EXTEND_SPEED = 4;
export const HOOK_SWING = 60; // degrees each side

// export const STAR_PLACEMENTS = [
//   { x: 170, y: 730 }, { x: 480, y: 540 }, { x: 700, y: 520 },
// ];

// =========================================================================
// MAIN GAME SCENE
// =========================================================================
export class DeepPurgeLevel extends Phaser.Scene {
    constructor() {
        super('DeepPurgeLevel');
        this.hookAngle = 0;
        this.hookSpeed = 1.2;
        this.hookDir = 1;
        this.hookLaunched = false;
        this.hookReturning = false;
        this.ropeLength = 0;
        this.hookedObject = null;
        this.score = 0;
        this.starsCollected = 0;
        this.timeLeft = GAME_DURATION;
        this.paused = false;
    }

    init(data) {
        this.score = data.score || 0;
        this.starsCollected = data.starsCollected || 0;
        this.timeLeft = data.timeLeft || GAME_DURATION;
    }

    preload() {
        this.load.image('Level02Background', './client/Levels/Level02/Assets/Backgrounds/Background_Level_2.png');
    }

    create() {
        this.createBackground();
        this.createBoat();
        this.createStars();
        this.createHook();
        this.createUI();
        this.createInputs();
        this.createTimer();

        const hint = this.add.text(this.scale.width / 2, this.scale.height / 2, "SPACE or TAP to cast hook", {
            fontFamily: "monospace", fontSize: "14px", color: "#ffffff",
        }).setOrigin(0.5).setDepth(20).setAlpha(0.85);
        this.tweens.add({ targets: hint, alpha: 0, delay: 3000, duration: 1000 });
    }

    update() {
        if (this.paused) return;
        this.updateHook();
        this.drawRopeAndHook();
    }

    createBackground() {
        const bg = this.add.image(0, 0, 'Level02Background').setOrigin(0, 0).setDepth(0);
        bg.setDisplaySize(this.scale.width, this.scale.height);
    }

    createBoat() {
        const bx = this.scale.width / 2;
        const by = 365;
        const g = this.add.graphics().setDepth(10);

        g.fillStyle(0x8B4513);
        g.fillRect(bx - 55, by - 10, 110, 22);
        g.fillStyle(0x6B3410);
        g.fillTriangle(bx - 55, by + 12, bx + 55, by + 12, bx, by + 28);
        g.fillStyle(0xddbb88);
        g.fillRect(bx - 20, by - 28, 40, 20);
        g.fillStyle(0x88ddff);
        g.fillRect(bx - 10, by - 24, 20, 12);
        g.fillStyle(0x4ecdc4);
        g.fillTriangle(bx - 20, by - 28, bx - 20, by - 46, bx + 2, by - 37);

        this.ropeOriginX = bx;
        this.ropeOriginY = by + 28;

        this.tweens.add({
            targets: g, y: "+=4", yoyo: true, repeat: -1,
            duration: 1500, ease: "Sine.easeInOut",
        });
    }

    createStars() {
        this.starGroup = this.add.group();

        // Divide the hook's 120-degree swing arc into three sectors to ensure 
        // the stars spread out nicely (Left, Center, Right)
        const sectors = [
            { minA: 20, maxA: 50 },   // Left side
            { minA: -15, maxA: 15 },  // Center
            { minA: -50, maxA: -20 }  // Right side
        ];

        sectors.forEach((sector) => {
            // 1. Pick a random angle within the current sector
            const randomAngle = Phaser.Math.Between(sector.minA, sector.maxA);
            const rad = Phaser.Math.DegToRad(randomAngle + 90);

            // 2. Calculate the maximum distance the star can be placed along this angle 
            // before it clips into the seafloor (y = 540)
            const maxDist = (540 - this.ropeOriginY) / Math.sin(rad);
            
            // 3. Pick a random distance along that vector 
            // (80 ensures it doesn't spawn right on top of the boat)
            const dist = Phaser.Math.Between(80, Math.floor(maxDist));

            // 4. Convert the polar coordinates back to Cartesian (x, y) for Phaser
            const posX = this.ropeOriginX + Math.cos(rad) * dist;
            const posY = this.ropeOriginY + Math.sin(rad) * dist;

            const g = this.add.graphics().setDepth(9);
            drawStar(g, 0, 0, 14, 0xffe066, 1); 
            g.setPosition(posX, posY);
            g.active = true;

            this.tweens.add({
                targets: g, alpha: 0.5, yoyo: true, repeat: -1,
                duration: 900, ease: "Sine.easeInOut",
            });

            this.starGroup.add(g);
        });
    }

    createHook() {
        this.ropeGraphics = this.add.graphics().setDepth(12);
        this.hookGraphics = this.add.graphics().setDepth(13);
    }

    getHookWorldPos() {
        const rad = Phaser.Math.DegToRad(this.hookAngle + 90);
        return {
            x: this.ropeOriginX + Math.cos(rad) * this.ropeLength,
            y: this.ropeOriginY + Math.sin(rad) * this.ropeLength,
        };
    }

    drawRopeAndHook() {
        this.ropeGraphics.clear();
        this.hookGraphics.clear();

        const hp = this.getHookWorldPos();

        this.ropeGraphics.lineStyle(2, 0xddcc88, 0.9);
        this.ropeGraphics.beginPath();
        this.ropeGraphics.moveTo(this.ropeOriginX, this.ropeOriginY);
        const steps = 12;
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const mx = Phaser.Math.Linear(this.ropeOriginX, hp.x, t);
            const sag = Math.sin(t * Math.PI) * (this.ropeLength * 0.08);
            const my = Phaser.Math.Linear(this.ropeOriginY, hp.y, t) + sag;
            this.ropeGraphics.lineTo(mx, my);
        }
        this.ropeGraphics.strokePath();

        this.hookGraphics.lineStyle(3, 0xaaaaaa, 1);
        this.hookGraphics.fillStyle(0xcccccc, 1);
        this.hookGraphics.fillCircle(hp.x, hp.y, 6);
        this.hookGraphics.strokeCircle(hp.x, hp.y, 6);

        this.hookGraphics.beginPath();
        this.hookGraphics.moveTo(hp.x, hp.y + 6);
        this.hookGraphics.lineTo(hp.x, hp.y + 14);
        this.hookGraphics.lineTo(hp.x + 8, hp.y + 18);
        this.hookGraphics.strokePath();

        if (this.hookedObject) {
            this.hookedObject.setPosition(hp.x, hp.y + 22);
        }
    }

    updateHook() {
        if (!this.hookLaunched) {
            this.hookAngle += this.hookSpeed * this.hookDir;
            if (Math.abs(this.hookAngle) >= HOOK_SWING) this.hookDir *= -1;
            this.ropeLength = 30;
            return;
        }

        if (!this.hookReturning) {
            this.ropeLength += HOOK_EXTEND_SPEED;
            if (this.ropeLength >= MAX_ROPE_LENGTH) {
                this.hookReturning = true;
            } else {
                this.checkStarCollision(this.getHookWorldPos());
            }
        } else {
            const returnSpeed = this.hookedObject ? HOOK_EXTEND_SPEED * 0.7 : HOOK_EXTEND_SPEED * 2;
            this.ropeLength -= returnSpeed;
            if (this.ropeLength <= 30) {
                this.onHookReturned();
            }
        }
    }

    onHookReturned() {
        this.ropeLength = 30;
        this.hookLaunched = false;
        this.hookReturning = false;

        if (this.hookedObject) {
            this.hookedObject.setVisible(false);
            this.hookedObject = null;
        }
    }

    launchHook() {
        if (this.hookLaunched || this.paused) return;
        this.hookLaunched = true;
        this.hookReturning = false;
        this.ropeLength = 0;
        this.hookedObject = null;
    }

    checkStarCollision(hp) {
        this.starGroup.getChildren().forEach((star) => {
            if (!star.active) return;
            if (Phaser.Math.Distance.Between(hp.x, hp.y, star.x, star.y) < 20) {
                this.hookedObject = star;
                star.active = false;
                this.starsCollected++;
                this.hookReturning = true;
                this.events.emit("starUpdate", this.starsCollected);

                if (this.starsCollected >= TOTAL_STARS) {
                    this.time.delayedCall(600, () => this.endGame(true));
                }
            }
        });
    }

    createUI() {
        this.scene.launch("Level02UIScene", { gameScene: this });
    }

    createInputs() {
        this.input.keyboard.on("keydown-SPACE", this.launchHook, this);
        this.input.on("pointerdown", this.launchHook, this);

        
        // NEW: Escape key to quit the level
        this.input.keyboard.on("keydown-ESC", this.quitGame, this);
    }

    createTimer() {
        this.timerEvent = this.time.addEvent({
            delay: 1000,
            callback: this.onTick,
            callbackScope: this,
            loop: true,
        });
    }

    onTick() {
        if (this.paused) return;
        this.timeLeft--;
        this.events.emit("timeUpdate", this.timeLeft);
        if (this.timeLeft <= 0) this.endGame(false);
    }

    endGame(won) {
        this.paused = true;
        if (this.timerEvent) this.timerEvent.remove();

        this.time.delayedCall(400, () => {
            this.scene.stop("Level02UIScene");
            this.scene.start(won ? "Level02WinScene" : "Level02LoseScene", {
                score: this.score,
                stars: this.starsCollected,
                timeLeft: this.timeLeft,
            });
        });
    }

    quitGame() {
        this.paused = true;
        if (this.timerEvent) {
            this.timerEvent.remove();
        }
        
        // Stop both the UI and Game scenes
        this.scene.stop("Level02UIScene");
        this.scene.stop("Level02GameScene");
        
        // Replace "MainMenuScene" with the actual key of your menu or level select scene!
        this.scene.start("LevelSelectScene"); 
    }
}

// =========================================================================
// UI SCENE
// =========================================================================
export class Level02UIScene extends Phaser.Scene {
    constructor() {
        super({ key: "Level02UIScene" });
    }

    init(data) {
        this.gameScene = data.gameScene;
    }

    create() {
        const panel = this.add.graphics();
        panel.fillStyle(0x000000, 0.45);
        panel.fillRoundedRect(10, 10, 240, 80, 10);

        const badge = this.add.graphics();
        badge.fillStyle(0x1565c0, 0.9);
        badge.fillRoundedRect(620, 10, 170, 50, 8);
        this.add.text(705, 35, "🌊 SDG 14 · Life Below Water", {
            fontFamily: "monospace",
            fontSize: "9px",
            color: "#ffffff",
        }).setOrigin(0.5);

        this.scoreLabel = this.add.text(20, 18, "SCORE", {
            fontFamily: "monospace", fontSize: "10px", color: "#4ecdc4",
        });
        this.scoreText = this.add.text(20, 32, "0", {
            fontFamily: "monospace", fontSize: "22px", color: "#ffffff", fontStyle: "bold",
        });

        this.timerLabel = this.add.text(130, 18, "TIME", {
            fontFamily: "monospace", fontSize: "10px", color: "#4ecdc4",
        });
        this.timerText = this.add.text(130, 32, "2:00", {
            fontFamily: "monospace", fontSize: "22px", color: "#ffffff", fontStyle: "bold",
        });

        this.starIcons = [];
        this.add.text(20, 64, "STARS:", {
            fontFamily: "monospace", fontSize: "11px", color: "#ffe066",
        });
        for (let i = 0; i < 3; i++) {
            const s = this.add.graphics();
            drawStar(s, 0, 0, 8, 0x334466, 1, 0.4);
            s.setPosition(88 + i * 24, 72);
            this.starIcons.push(s);
        }

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
                const filled = i < count;
                drawStar(this.starIcons[i], 0, 0, 8, filled ? 0xffe066 : 0x334466, 1, filled ? 1 : 0.4);
            }
        });

        this.add.text(400, 588, "Collect ★ stars to clear the level • Clean the ocean! 🌊", {
            fontFamily: "monospace", fontSize: "10px", color: "#aaccff", alpha: 0.7,
        }).setOrigin(0.5).setAlpha(0.7);
        
    }
}

// =========================================================================
// LOSE SCENE
// =========================================================================
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

        this.add.text(400, 265, "Stars collected:", {
            fontFamily: "monospace", fontSize: "12px", color: "#ffe066",
        }).setOrigin(0.5);
        
        for (let i = 0; i < 3; i++) {
            const g = this.add.graphics();
            const filled = i < this.starsCollected;
            drawStar(g, 340 + i * 60, 305, 18, filled ? 0xffe066 : 0x334466, filled ? 1 : 0.35, 0.4);
        }

        this.add.text(400, 345, `SCORE: ${this.finalScore}`, {
            fontFamily: "monospace", fontSize: "20px", color: "#ffffff", fontStyle: "bold",
        }).setOrigin(0.5);

        this.add.text(400, 375,
            `"The ocean is running out of time.\nEvery piece of trash matters."`,
            { fontFamily: "monospace", fontSize: "10px", color: "#7799cc", align: "center" }
        ).setOrigin(0.5);

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
}

// =========================================================================
// WIN SCENE
// =========================================================================
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
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x0d5a8c, 0x0d5a8c, 0x020c18, 0x020c18, 1);
        bg.fillRect(0, 0, 800, 600);

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

        const quote = this.add.text(400, 260,
            '"Conserve and sustainably use the oceans,\nseas and marine resources."',
            { fontFamily: "monospace", fontSize: "11px", color: "#88ccff", align: "center" }
        ).setOrigin(0.5);

        for (let i = 0; i < 3; i++) {
            const g = this.add.graphics();
            const filled = i < this.starsCollected;
            drawStar(g, 340 + i * 60, 315, 20, filled ? 0xffe066 : 0x334466, filled ? 1 : 0.4, 0.5);
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

        const btn = this.add.graphics();
        btn.fillStyle(0x4ecdc4, 1);
        btn.fillRoundedRect(300, 420, 200, 44, 10);
        this.add.text(400, 442, "PLAY AGAIN", {
            fontFamily: "monospace", fontSize: "16px", color: "#001122", fontStyle: "bold",
        }).setOrigin(0.5);

        btn.setInteractive(new Phaser.Geom.Rectangle(300, 420, 200, 44), Phaser.Geom.Rectangle.Contains);
        btn.on("pointerover", () => { btn.clear(); btn.fillStyle(0x7eede6, 1); btn.fillRoundedRect(300, 420, 200, 44, 10); });
        btn.on("pointerout", () => { btn.clear(); btn.fillStyle(0x4ecdc4, 1); btn.fillRoundedRect(300, 420, 200, 44, 10); });
        btn.on("pointerdown", () => {
            this.scene.stop("Level02WinScene");
            this.scene.start("Level02GameScene");
        });

        this._spawnCelebration();
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