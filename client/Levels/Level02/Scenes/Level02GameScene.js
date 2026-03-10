import { GameFlowManager } from '../../../Core/GameFlowManager.js';
import { GameState } from '../../../Core/GameState.js';
import { drawStar } from '../Helpers/drawStar.js';

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

export const STAR_PLACEMENTS = [
  { x: 170, y: 490 }, { x: 480, y: 470 }, { x: 700, y: 490 },
];


// =========================================================================
// SCENE CLASS
// =========================================================================
export class Level02GameScene extends Phaser.Scene {

    constructor() {
        super('Level02GameScene');

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

        // Fade-out hint
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

    // =========================================================================
    // BACKGROUND
    // =========================================================================
    createBackground() {
        const bg = this.add.image(0, 0, 'Level02Background').setOrigin(0, 0).setDepth(0);
        bg.setDisplaySize(this.scale.width, this.scale.height);
    }

    // =========================================================================
    // BOAT
    // =========================================================================
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

    // =========================================================================
    // STARS
    // =========================================================================
    createStars() {
        this.starGroup = this.add.group();

        STAR_PLACEMENTS.forEach((pos) => {
            const g = this.add.graphics().setDepth(9);
            drawStar(g, 300, 300, 14, 0xffe066, 1); 
            g.setPosition(pos.x, pos.y);
            g.active = true;

            this.tweens.add({
                targets: g, alpha: 0.5, yoyo: true, repeat: -1,
                duration: 900, ease: "Sine.easeInOut",
            });

            this.starGroup.add(g);
        });
    }

    // =========================================================================
    // HOOK
    // =========================================================================
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

        // Rope
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

        // Hook head
        this.hookGraphics.lineStyle(3, 0xaaaaaa, 1);
        this.hookGraphics.fillStyle(0xcccccc, 1);
        this.hookGraphics.fillCircle(hp.x, hp.y, 6);
        this.hookGraphics.strokeCircle(hp.x, hp.y, 6);

        // Hook curve
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
            // Idle swing
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

    // =========================================================================
    // COLLISIONS
    // =========================================================================
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

    // =========================================================================
    // UI
    // =========================================================================
    createUI() {
        this.scene.launch("Level02UIScene", { gameScene: this });
    }

    // =========================================================================
    // INPUT
    // =========================================================================
    createInputs() {
        this.input.keyboard.on("keydown-SPACE", this.launchHook, this);
        this.input.on("pointerdown", this.launchHook, this);
    }

    // =========================================================================
    // TIMER
    // =========================================================================
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

    // =========================================================================
    // END GAME
    // =========================================================================
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
    })
}}