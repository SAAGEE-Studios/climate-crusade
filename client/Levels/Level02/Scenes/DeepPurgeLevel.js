import { GameFlowManager } from '../../../Core/GameFlowManager.js'; 
import { GameState } from '../../../Core/GameState.js';
import {LevelSelectScene} from '../../../LevelSelect/LevelSelectScene.js';

// =========================================================================
// HELPER FUNCTIONS
// =========================================================================
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
export const TOTAL_STARS = 3;
export const GAME_DURATION = 120;
export const HOOK_EXTEND_SPEED = 4;
export const MAX_ROPE_LENGTH = 720;
export const HOOK_SWING = 75;

// =========================================================================
// MAIN GAME SCENE 
// =========================================================================
export class DeepPurgeLevel extends Phaser.Scene {
    constructor() {
        super('DeepPurgeLevel');
    }

    init() {
        this.starsCollected = 0;
        this.timeLeft = GAME_DURATION;
        this.hookAngle = 0;
        this.hookSpeed = 2.4;
        this.hookDir = 1;
        this.hookLaunched = false;
        this.hookReturning = false;
        this.ropeLength = 0;
        this.hookedObject = null;
        this.paused = false;
        this.levelFinished = false;
    }

    preload() {
        this.load.image('Level02Background', './client/Levels/Level02/Assets/Backgrounds/Background_Level_2.png');
        this.load.image('starCollect', './client/Levels/Level02/Assets/Items/Star_to_collect.png');
        this.load.image('boat', './client/Levels/Level02/Assets/Items/Boat.png');
    }

    create() {
        this.levelFinished = false;

        this.createBackground();
        this.createBoat();
        this.createStars();
        this.createHook();
        this.createHUD();
        this.createInputs();
        this.createTimer();

        const hint = this.add.text(this.scale.width / 2, this.scale.height / 2,
            "SPACE or TAP to cast hook", {
                fontFamily: "monospace", fontSize: "14px", color: "#ffffff",
            }).setOrigin(0.5).setDepth(20).setAlpha(0.85);
        this.tweens.add({ targets: hint, alpha: 0, delay: 3000, duration: 1000 });
    }

    update() {
        if (this.paused) return;
        this.updateHook();
        this.drawRopeAndHook();
    }

    // ── Background ──────────────────────────────────────────────────────────
    createBackground() {
    const bg = this.add.image(
        this.scale.width / 2,
        this.scale.height / 2,
        'Level02Background'
    )
        .setOrigin(0.5, 0.5)
        .setDepth(0);

    const scaleX = this.scale.width / bg.width;
    const scaleY = this.scale.height / bg.height;
    const scale = Math.max(scaleX, scaleY);  // cover mode — no empty edges

    bg.setScale(scale * 1.0);  // ← change 1.0 to e.g. 1.2 to zoom in
}
    // ── Boat ────────────────────────────────────────────────────────────────
    createBoat() {
        const bx = this.scale.width / 2;
        
        // FIX 1: Pushed the waterline from 320 down to 380 so it sits 
        // perfectly on the horizon line in the background image.
        const waterlineY = 430; 

        const boat = this.add.image(bx, waterlineY, 'boat')
            .setOrigin(0.5, 0.85)
            .setDisplaySize(330, 210)
            .setDepth(10);

        this.ropeOriginX = bx + 90;
        this.ropeOriginY = waterlineY - 80;

        this.tweens.add({
            targets: boat, y: "+=5", yoyo: true, repeat: -1,
            duration: 1500, ease: "Sine.easeInOut",
        });
    }
    // ── Stars ───────────────────────────────────────────────────────────────
    createStars() {
        this.starGroup = this.add.group();
        const placed = [];

        for (let i = 0; i < TOTAL_STARS; i++) {
            let posX, posY, attempts = 0;
            let isValid = false;

            do {
                // FIX 2: Pick an angle inside the hook's ±60 degree swing (using ±52 for a safety buffer)
                const randomAngle = Phaser.Math.Between(-52, 52);
                const rad = Phaser.Math.DegToRad(randomAngle + 90);

                // FIX 3: Pick a distance the hook can actually reach (max rope is 720, so 63 0 is safe)
                const dist = Phaser.Math.Between(180, 630);

                // Calculate exact X and Y from the boat's rope origin
                posX = this.ropeOriginX + Math.cos(rad) * dist;
                posY = this.ropeOriginY + Math.sin(rad) * dist;

                attempts++;

                // FIX 4: Validate! Must be visually underwater (Y > 430) AND not overlapping other stars
                const isDeepEnough = posY > 430; 
                const isFarFromOthers = !placed.some(p => Phaser.Math.Distance.Between(posX, posY, p.x, p.y) < 130);
                
                isValid = isDeepEnough && isFarFromOthers;

            } while (!isValid && attempts < 100);

            placed.push({ x: posX, y: posY });

            const star = this.add.image(posX, posY, 'starCollect')
                .setDisplaySize(48, 48)
                .setDepth(9);
            star.active = true;

            this.tweens.add({
                targets: star, alpha: 0.6, yoyo: true, repeat: -1,
                duration: 900, ease: "Sine.easeInOut",
            });

            this.starGroup.add(star);
        }
    }

    // ── Hook / Rope ─────────────────────────────────────────────────────────
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
        const steps = 24;
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
            if (this.ropeLength <= 30) this.onHookReturned();
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
            if (Phaser.Math.Distance.Between(hp.x, hp.y, star.x, star.y) < 28) {
                this.hookedObject = star;
                star.active = false;
                this.starsCollected++;
                this.hookReturning = true;
                this.updateStarHUD();

                if (this.starsCollected >= TOTAL_STARS) {
                    this.time.delayedCall(600, () => this.endGame(true));
                }
            }
        });
    }

    // ── HUD (drawn directly on this scene) ──────────────────────────────────
    createHUD() {
        const panel = this.add.graphics().setDepth(50);
        panel.fillStyle(0x000000, 0.45);
        panel.fillRoundedRect(10, 10, 240, 80, 10);

        const badge = this.add.graphics().setDepth(50);
        badge.fillStyle(0x1565c0, 0.9);
        badge.fillRoundedRect(GAME_WIDTH - 180, 10, 170, 50, 8);
        this.add.text(GAME_WIDTH - 95, 35, " SDG 13 · Climate Action",  {
            fontFamily: "monospace", fontSize: "13px", color: "#ffffff",
        }).setOrigin(0.5).setDepth(51);

        // this.add.text(20, 18, "SCORE", {
        //     fontFamily: "monospace", fontSize: "10px", color: "#4ecdc4",
        // }).setDepth(51);
        // this.scoreText = this.add.text(20, 32, "0", {
        //     fontFamily: "monospace", fontSize: "22px", color: "#ffffff", fontStyle: "bold",
        // }).setDepth(51);

        this.add.text(20, 18, "TIME", {
            fontFamily: "monospace", fontSize: "10px", color: "#4ecdc4",
        }).setDepth(51);
        this.timerText = this.add.text(130, 32, "2:00", {
            fontFamily: "monospace", fontSize: "22px", color: "#ffffff", fontStyle: "bold",
        }).setDepth(51);

        this.add.text(20, 64, "STARS:", {
            fontFamily: "monospace", fontSize: "11px", color: "#ffe066",
        }).setDepth(51);

        this.starHUDIcons = [];
        for (let i = 0; i < 3; i++) {
            const s = this.add.graphics().setDepth(51);
            drawStar(s, 0, 0, 8, 0x334466, 1, 0.4);
            s.setPosition(20 + i * 24, 72);
            this.starHUDIcons.push(s);
        }

        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 12, "Collect ★  stars to clear the level • Clean the ocean! 🌊", {
            fontFamily: "monospace", fontSize: "10px", color: "#aaccff",
        }).setOrigin(0.5).setAlpha(0.7).setDepth(51);
    }

    updateTimerHUD() {
        const m = Math.floor(this.timeLeft / 60);
        const s = this.timeLeft % 60;
        this.timerText.setText(`${m}:${s.toString().padStart(2, "0")}`);
        if (this.timeLeft <= 30) this.timerText.setColor("#ff6666");
        else if (this.timeLeft <= 60) this.timerText.setColor("#ffaa44");
    }

    updateStarHUD() {
        for (let i = 0; i < 3; i++) {
            this.starHUDIcons[i].clear();
            const filled = i < this.starsCollected;
            drawStar(this.starHUDIcons[i], 0, 0, 8, filled ? 0xffe066 : 0x334466, 1, filled ? 1 : 0.4);
        }
    }

    // ── Inputs ───────────────────────────────────────────────────────────────
    createInputs() {
        this.input.keyboard.on("keydown-SPACE", this.launchHook, this);
        this.input.on("pointerdown", this.launchHook, this);
        this.input.keyboard.on("keydown-ESC", this.quitGame, this);
    }

    // ── Timer ────────────────────────────────────────────────────────────────
    createTimer() {
        this.timerEvent = this.time.addEvent({
            delay: 1000,
            callback: () => {
                if (this.paused) return;
                this.timeLeft--;
                this.updateTimerHUD();
                if (this.timeLeft <= 0) this.endGame(false);
            },
            loop: true,
        });
    }

    // ── End Game ─────────────────────────────────────────────────────────────
    endGame(won) {
        if (this.levelFinished) return;
        this.levelFinished = true;
        this.paused = true;
        if (this.timerEvent) this.timerEvent.remove();

        this.time.delayedCall(400, () => {
            won ? this.showWinOverlay() : this.showLoseOverlay();
        });
    }

    showWinOverlay() {
        // Gradient background
        const bg = this.add.graphics().setDepth(60);
        bg.fillGradientStyle(0x0d5a8c, 0x0d5a8c, 0x020c18, 0x020c18, 1);
        bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        const panel = this.add.graphics().setDepth(61);
        panel.fillStyle(0x000000, 0.6);
        panel.fillRoundedRect(200, 130, 400, 340, 20);
        panel.lineStyle(2, 0x4ecdc4, 0.8);
        panel.strokeRoundedRect(200, 130, 400, 340, 20);

        this.add.text(400, 175, "🌊 OCEAN CLEARED!", {
            fontFamily: "monospace", fontSize: "42px", color: "#4ecdc4", fontStyle: "bold",
        }).setOrigin(0.5).setDepth(62);

        this.add.text(400, 220, "You helped save Life Below Water", {
            fontFamily: "monospace", fontSize: "28px", color: "#aaddff",
        }).setOrigin(0.5).setDepth(62);

        this.add.text(400, 260,
            '"Take urgent action to combat climate change\nand it\'s impacts"',
            { fontFamily: "monospace", fontSize: "25px", color: "#88ccff", align: "center" }
        ).setOrigin(0.5).setDepth(62);

        for (let i = 0; i < 3; i++) {
            const g = this.add.graphics().setDepth(62);
            const filled = i < this.starsCollected;
            drawStar(g, 340 + i * 60, 315, 20, filled ? 0xffe066 : 0x334466, filled ? 1 : 0.4, 0.5);
            if (filled) {
                this.tweens.add({
                    targets: g, scaleX: 1.2, scaleY: 1.2,
                    yoyo: true, repeat: -1,
                    duration: 700 + i * 150, ease: "Sine.easeInOut",
                });
            }
        }


        const m = Math.floor(this.timeLeft / 60);
        const s = this.timeLeft % 60;
        this.add.text(400, 390, `Time remaining: ${m}:${s.toString().padStart(2, "0")}`, {
            fontFamily: "monospace", fontSize: "13px", color: "#aaddff",
        }).setOrigin(0.5).setDepth(62);

        // Play Again button
        const btn = this.add.graphics().setDepth(62);
        btn.fillStyle(0x4ecdc4, 1);
        btn.fillRoundedRect(300, 420, 200, 44, 10);
        this.add.text(400, 442, "PLAY AGAIN", {
            fontFamily: "monospace", fontSize: "16px", color: "#001122", fontStyle: "bold",
        }).setOrigin(0.5).setDepth(63);

        btn.setInteractive(new Phaser.Geom.Rectangle(300, 420, 200, 44), Phaser.Geom.Rectangle.Contains);
        btn.on("pointerover", () => { btn.clear(); btn.fillStyle(0x7eede6, 1); btn.fillRoundedRect(300, 420, 200, 44, 10); });
        btn.on("pointerout",  () => { btn.clear(); btn.fillStyle(0x4ecdc4, 1); btn.fillRoundedRect(300, 420, 200, 44, 10); });
        btn.on("pointerdown", () => this.scene.restart());

        this._spawnCelebration();
    }

    showLoseOverlay() {
        const bg = this.add.graphics().setDepth(60);
        bg.fillGradientStyle(0x06101e, 0x06101e, 0x020c18, 0x020c18, 1);
        bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        const panel = this.add.graphics().setDepth(61);
        panel.fillStyle(0x000000, 0.65);
        panel.fillRoundedRect(200, 140, 400, 320, 20);
        panel.lineStyle(2, 0xff6666, 0.7);
        panel.strokeRoundedRect(200, 140, 400, 320, 20);

        this.add.text(400, 185, "⏰ TIME'S UP!", {
            fontFamily: "monospace", fontSize: "28px", color: "#ff6666", fontStyle: "bold",
        }).setOrigin(0.5).setDepth(62);

        this.add.text(400, 225, "The ocean still needs your help...", {
            fontFamily: "monospace", fontSize: "13px", color: "#aaddff",
        }).setOrigin(0.5).setDepth(62);

        this.add.text(400, 265, "Stars collected:", {
            fontFamily: "monospace", fontSize: "12px", color: "#ffe066",
        }).setOrigin(0.5).setDepth(62);

        for (let i = 0; i < 3; i++) {
            const g = this.add.graphics().setDepth(62);
            const filled = i < this.starsCollected;
            drawStar(g, 340 + i * 60, 305, 18, filled ? 0xffe066 : 0x334466, filled ? 1 : 0.35, 0.4);
        }


        const btn = this.add.graphics().setDepth(62);
        btn.fillStyle(0xff6666, 1);
        btn.fillRoundedRect(300, 410, 200, 44, 10);
        this.add.text(400, 432, "TRY AGAIN", {
            fontFamily: "monospace", fontSize: "16px", color: "#ffffff", fontStyle: "bold",
        }).setOrigin(0.5).setDepth(63);

        btn.setInteractive(new Phaser.Geom.Rectangle(300, 410, 200, 44), Phaser.Geom.Rectangle.Contains);
        btn.on("pointerover", () => { btn.clear(); btn.fillStyle(0xff9999, 1); btn.fillRoundedRect(300, 410, 200, 44, 10); });
        btn.on("pointerout",  () => { btn.clear(); btn.fillStyle(0xff6666, 1); btn.fillRoundedRect(300, 410, 200, 44, 10); });
        btn.on("pointerdown", () => this.scene.restart());
    }

    _spawnCelebration() {
        const colors = [0x4ecdc4, 0xffe066, 0xff6b9d, 0x88ccff, 0xaaffaa];
        for (let i = 0; i < 30; i++) {
            const p = this.add.graphics().setDepth(65);
            p.fillStyle(Phaser.Math.RND.pick(colors), 0.9);
            p.fillCircle(0, 0, Phaser.Math.Between(3, 7));
            p.setPosition(Phaser.Math.Between(0, GAME_WIDTH), Phaser.Math.Between(-50, 0));
            this.tweens.add({
                targets: p, y: 700,
                x: `+=${Phaser.Math.Between(-80, 80)}`,
                alpha: 0,
                delay: Phaser.Math.Between(0, 1500),
                duration: Phaser.Math.Between(2000, 4000),
                ease: "Power1",
                repeat: -1,
                repeatDelay: Phaser.Math.Between(500, 2000),
                onRepeat: () => { p.setPosition(Phaser.Math.Between(0, GAME_WIDTH), -10); p.setAlpha(0.9); },
            });
        }
    }

    quitGame() {
        if (this.timerEvent) this.timerEvent.remove();
        this.scene.start("LevelSelectScene");
    }
}