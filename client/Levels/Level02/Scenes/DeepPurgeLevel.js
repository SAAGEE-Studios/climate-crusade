import { GameFlowManager } from '../../../Core/GameFlowManager.js'; 
import { GameState } from '../../../Core/GameState.js';
import {LevelSelectScene} from '../../../LevelSelect/LevelSelectScene.js';
import { saveProgress } from '../../../Core/api.js'; 

// =========================================================================
// HELPER FUNCTIONS
// =========================================================================

/**
 * Draws a customized star shape onto a Phaser Graphics object.
 *
 * Uses trigonometric calculations to generate the inner and outer points
 * of a standard five-pointed star and applies the specified fill and stroke.
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
export const TOTAL_STARS = 3;
export const GAME_DURATION = 120;
export const HOOK_EXTEND_SPEED = 4;
export const MAX_ROPE_LENGTH = 720;
export const HOOK_SWING = 75;
export const TRASH_SPAWNED = 6;

// =========================================================================
// MAIN GAME SCENE 
// =========================================================================

/**
 * DeepPurgeLevel
 * --------------
 * Main gameplay scene for Level 02.
 *
 * Handles the fishing/hook mechanic, timer, star collection,
 * trash clearing, pause menu, and level completion overlays.
 *
 * Also manages star tracking and progress persistence.
 */
export class DeepPurgeLevel extends Phaser.Scene {
    constructor() {
        super('DeepPurgeLevel');
    }

    /**
     * Initializes the level state.
     * * Sets up initial variables for stars collected, trash cleared,
     * remaining time, hook properties, and game states before the scene starts.
     */
    init() {
        this.starsCollected = 0;
        this.trashCleared = 0; 
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
        this.isPausedMenuOpen = false;
        this.placedItems = []; 
    }

    /**
     * Preloads all necessary assets for the level.
     *
     * Loads images for the background, boat, hook, collectibles (stars),
     * and various types of trash needed for the gameplay.
     */
    preload() {
        this.load.image('Level02Background', './client/Levels/Level02/Assets/Backgrounds/Background_Level_2.png');
        this.load.image('starCollect', './client/Levels/Level02/Assets/Items/Star_to_collect.png');
        this.load.image('boat', './client/Levels/Level02/Assets/Items/Boat.png');
        this.load.image('hook', './client/Levels/Level02/Assets/Items/Hook.PNG');

        this.load.image('bottle', './client/Levels/Level02/Assets/Items/Plastic_Bottle.webp');
        this.load.image('wrap', './client/Levels/Level02/Assets/Items/Plastic_Wrap.webp');
        this.load.image('tire', './client/Levels/Level02/Assets/Items/Tire.webp');
        this.load.image('bag', './client/Levels/Level02/Assets/Items/Trash_Bag.webp');
    }

    /**
     * Sets up the level environment and gameplay systems.
     *
     * Initializes the background, boat, interactable items (stars and trash),
     * the hook mechanism, HUD, inputs, and the countdown timer.
     */
    create() {
        this.levelFinished = false;

        this.createBackground();
        this.createBoat();
        this.createStars();
        this.createTrash(); 
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

    /**
     * Main game loop executed every frame.
     *
     * Handles pause menu logic, end-level transitions, user inputs for casting
     * the hook, and updates the hook's movement and rendering.
     */
    update(time,delta) {
        // Handle active Pause Menu state
        if (this.isPausedMenuOpen) {
            if (Phaser.Input.Keyboard.JustDown(this.confirmKey)) {
                this.isPausedMenuOpen = false;
                // Transition to Title Card
                this.scene.start('Level02EntryScene'); 
                return;
            }
            if (Phaser.Input.Keyboard.JustDown(this.cancelKey)) {
                this.closePauseMenu();
                return;
            }
            return;
        }

        // Handle End Level specific exit inputs
        if (this.levelFinished) {
            if (Phaser.Input.Keyboard.JustDown(this.spaceKey) || Phaser.Input.Keyboard.JustDown(this.escKey)) {
                // Transition to Title Card
                this.scene.start('Level02EntryScene');
            }
            return;
        }

        // Handle ESC to open Pause Menu during gameplay
        if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
            if (!this.isPausedMenuOpen && !this.levelFinished) {
                this.openPauseMenu();
                return;
            }
        }

        if (this.paused) return;

        // Check space key for gameplay
        if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
            this.launchHook();
        }

        this.updateHook(delta);
        this.drawRopeAndHook();
    }

    // ── Background ──────────────────────────────────────────────────────────

    /**
     * Generates and scales the background image.
     *
     * Ensures the background correctly fits the screen dimensions while
     * maintaining its aspect ratio.
     */
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
        const scale = Math.max(scaleX, scaleY);  

        bg.setScale(scale * 1.0); 
    }

    // ── Boat ────────────────────────────────────────────────────────────────

    /**
     * Creates the player's boat and its bobbing animation.
     *
     * Sets the origin point for the fishing rope and adds a continuous
     * vertical tween to simulate floating on water.
     */
    createBoat() {
        const bx = this.scale.width / 2;
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

    /**
     * Spawns the collectible stars.
     *
     * Places a predefined number of stars at valid, non-overlapping
     * positions underwater for the player to collect.
     */
    createStars() {
        this.starGroup = this.add.group();
        for (let i = 0; i < TOTAL_STARS; i++) {
            const pos = this.getValidPosition();
            if (pos) {
                const star = this.add.image(pos.x, pos.y, 'starCollect')
                    .setDisplaySize(48, 48)
                    .setDepth(9);
                star.active = true;
                this.starGroup.add(star);
                this.placedItems.push(pos);
            }
        }
    }

    /**
     * Spawns the clearable trash items.
     *
     * Randomly selects trash types and places them at valid, non-overlapping
     * positions underwater alongside the stars.
     */
    createTrash() {
        this.trashGroup = this.add.group();
        const trashTypes = ['bottle', 'wrap', 'tire', 'bag'];

        for (let i = 0; i < TRASH_SPAWNED; i++) {
            const pos = this.getValidPosition();
            if (pos) {
                const type = Phaser.Math.RND.pick(trashTypes);
                const trash = this.add.image(pos.x, pos.y, type)
                    .setDisplaySize(75, 75)
                    .setDepth(9);
                trash.active = true;
                this.trashGroup.add(trash);
                this.placedItems.push(pos);
            }
        }
    }

    /**
     * Calculates a valid underwater spawn position for items.
     *
     * Ensures that generated coordinates are below the waterline and
     * adequately spaced out from previously placed items to prevent overlap.
     */
    getValidPosition() {
        let posX, posY, attempts = 0;
        let isValid = false;

        do {
            const randomAngle = Phaser.Math.Between(-52, 52);
            const rad = Phaser.Math.DegToRad(randomAngle + 90);
            const dist = Phaser.Math.Between(180, 630);

            posX = this.ropeOriginX + Math.cos(rad) * dist;
            posY = this.ropeOriginY + Math.sin(rad) * dist;

            attempts++;

            const isDeepEnough = posY > 430; 
            const isFarFromOthers = !this.placedItems.some(p => 
                Phaser.Math.Distance.Between(posX, posY, p.x, p.y) < 110
            );
            
            isValid = isDeepEnough && isFarFromOthers;
        } while (!isValid && attempts < 100);

        return isValid ? { x: posX, y: posY } : null;
    }

    // ── Hook / Rope ─────────────────────────────────────────────────────────

    /**
     * Initializes the graphical elements for the hook and rope.
     *
     * Creates a graphics object for drawing the rope line and sets up
     * the hidden hook sprite used during gameplay.
     */
    createHook() {
        this.ropeGraphics = this.add.graphics().setDepth(12);
        this.hookSprite = this.add.image(0, 0, 'hook')
            .setDisplaySize(40, 60)
            .setOrigin(0.5, 0)
            .setDepth(13)
            .setVisible(false);
    }

    /**
     * Calculates the current world coordinates of the hook.
     *
     * Uses the rope's origin point, current length, and swing angle to
     * determine exactly where the end of the hook is located.
     */
    getHookWorldPos() {
        const rad = Phaser.Math.DegToRad(this.hookAngle + 90);
        return {
            x: this.ropeOriginX + Math.cos(rad) * this.ropeLength,
            y: this.ropeOriginY + Math.sin(rad) * this.ropeLength,
        };
    }

    /**
     * Renders the rope and hook visuals every frame.
     *
     * Clears and redraws the rope line with a slight sag effect, positions
     * the hook sprite, and updates the position of any hooked object.
     */
    drawRopeAndHook() {
        this.ropeGraphics.clear();
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

        const rad = Phaser.Math.DegToRad(this.hookAngle + 90);
        this.hookSprite
            .setPosition(hp.x, hp.y)
            .setRotation(rad - Math.PI / 2)
            .setVisible(true);

        if (this.hookedObject) {
            this.hookedObject.setPosition(hp.x, hp.y + 50);
        }
    }

    /**
     * Handles the physics and state transitions of the hook.
     *
     * Manages the continuous swinging motion when idle, the extension speed
     * when launched, and the retraction speed when returning with or without an item.
     */
    updateHook(delta) {
        if (!this.hookLaunched) {
            this.hookAngle += (this.hookSpeed * (delta/16.66) )* this.hookDir;

            if (Math.abs(this.hookAngle) >= HOOK_SWING) this.hookDir *= -1;
            this.ropeLength = 30;
            return;
        }

        if (!this.hookReturning) {
            this.ropeLength += HOOK_EXTEND_SPEED * (delta / 16.66);
            if (this.ropeLength >= MAX_ROPE_LENGTH) {
                this.hookReturning = true;
            } else {
                this.checkStarCollision(this.getHookWorldPos());
            }
        } else {
            const returnSpeed = this.hookedObject ? HOOK_EXTEND_SPEED * 0.7 : HOOK_EXTEND_SPEED * 4;   //Increased the return speed
            this.ropeLength -= returnSpeed * (delta / 16.66);
            if (this.ropeLength <= 30) this.onHookReturned();
        }
    }

    /**
     * Resets the hook state after it fully retracts.
     *
     * Clears the hooked object, resets the rope length, and allows the player
     * to cast the hook again.
     */
    onHookReturned() {
        this.ropeLength = 30;
        this.hookLaunched = false;
        this.hookReturning = false;
        if (this.hookedObject) {
            this.hookedObject.setVisible(false);
            this.hookedObject = null;
        }
    }

    /**
     * Initiates the hook casting action.
     *
     * Locks the swinging angle and begins extending the rope downwards
     * if the game is active and the hook isn't already launched.
     */
    launchHook() {
        if (this.hookLaunched || this.paused) return;
        this.hookLaunched = true;
        this.hookReturning = false;
        this.ropeLength = 0;
        this.hookedObject = null;
    }

    /**
     * Detects collisions between the hook and underwater items.
     *
     * Iterates through active stars and trash. If an item is within range,
     * it attaches to the hook, updates HUD counters, and triggers the return phase.
     */
    checkStarCollision(hp) {
        if (this.hookedObject) return;

        const allItems = [...this.starGroup.getChildren(), ...this.trashGroup.getChildren()];

        for (const item of allItems) {
            if (!item.active) continue;

            if (Phaser.Math.Distance.Between(hp.x, hp.y, item.x, item.y) < 38) {
                this.hookedObject = item;
                item.active = false;
                this.hookReturning = true;

                if (item.texture.key === 'starCollect') {
                    this.starsCollected++;
                    this.updateStarHUD();
                } else {
                    this.trashCleared++;
                }
                break; 
            }
        }

        if (this.trashCleared >= TRASH_SPAWNED) {
            this.time.delayedCall(600, () => this.endGame(true));
        }
    }

    // ── HUD ─────────────────────────────────────────────────────────────────

    /**
     * Initializes the Heads-Up Display (HUD).
     *
     * Creates the time text, star collection icons, and instructional
     * text to guide the player at the start of the level.
     */
    createHUD() {
        const panel = this.add.graphics().setDepth(50);
        panel.fillStyle(0x000000, 0.45);
        panel.fillRoundedRect(10, 10, 240, 80, 10);

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

    /**
     * Updates the visual countdown timer.
     *
     * Formats the remaining time into minutes and seconds, and changes
     * the text color to indicate urgency as time runs low.
     */
    updateTimerHUD() {
        const m = Math.floor(this.timeLeft / 60);
        const s = this.timeLeft % 60;
        this.timerText.setText(`${m}:${s.toString().padStart(2, "0")}`);
        if (this.timeLeft <= 30) this.timerText.setColor("#ff6666");
        else if (this.timeLeft <= 60) this.timerText.setColor("#ffaa44");
    }

    /**
     * Updates the visual representation of collected stars.
     *
     * Fills in the star icons on the HUD dynamically as the player
     * successfully retrieves stars from the water.
     */
    updateStarHUD() {
        for (let i = 0; i < 3; i++) {
            this.starHUDIcons[i].clear();
            const filled = i < this.starsCollected;
            drawStar(this.starHUDIcons[i], 0, 0, 8, filled ? 0xffe066 : 0x334466, 1, filled ? 1 : 0.4);
        }
    }

    // ── Inputs ──────────────────────────────────────────────────────────────

    /**
     * Configures player input handlers.
     *
     * Sets up keyboard keys (SPACE, ESC) and pointer/touch events for
     * launching the hook and navigating menus.
     */
    createInputs() {
        // Setup keyboard handlers
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

        // Tap/click for launch
        this.input.on("pointerdown", () => {
            if (!this.isPausedMenuOpen && !this.levelFinished && !this.paused) {
                this.launchHook();
            }
        }, this);
    }

    // ── Timer ───────────────────────────────────────────────────────────────

    /**
     * Starts the main game countdown timer.
     *
     * Ticks down every second, updates the HUD, and triggers the game over
     * sequence if the time reaches zero.
     */
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

    // ── End Game ────────────────────────────────────────────────────────────

    /**
     * Handles the end-of-level sequence.
     *
     * Pauses the game, stops the timer, saves the player's progress if they won,
     * and displays the appropriate win or lose overlay.
     */
    async endGame(won) {
        if (this.levelFinished) return;
        this.levelFinished = true;
        this.paused = true;
        if (this.timerEvent) this.timerEvent.remove();

        if (won) {
            if (GameState.userId) {
                try {
                    console.log(`Saving ${this.starsCollected} stars for user ${GameState.userId}`);
                    await saveProgress(GameState.userId, 'level02', this.starsCollected);
                } catch (err) {
                    console.error("Failed to save progress:", err.message);
                }
            } else {
                console.warn("No User ID found. Progress will not be saved.");
            }
            this.showWinOverlay();
        } else {
            this.showLoseOverlay();
        }
    }

    /**
     * Displays the victory screen.
     *
     * Shows the time remaining, animated stars based on player performance, 
     * educational tips about ocean conservation, and triggers celebration effects.
     */
    showWinOverlay() {
        const cx = this.scale.width / 2;
        const cy = this.scale.height / 2;

        const bg = this.add.graphics().setDepth(60);
        bg.fillStyle(0x0d2a4a, 0.55);
        bg.fillRect(0, 0, this.scale.width, this.scale.height);

        const panelW = 600; 
        const panelH = 500; 
        const panelX = cx - panelW / 2;
        const panelY = cy - panelH / 2;

        const panel = this.add.graphics().setDepth(61);
        panel.fillStyle(0x020c18, 0.75);
        panel.fillRoundedRect(panelX, panelY, panelW, panelH, 20);
        panel.lineStyle(2, 0x4ecdc4, 0.9);
        panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 20);

        this.add.text(cx, panelY + 45, "🌊 OCEAN CLEARED!", {
            fontFamily: "monospace", fontSize: "30px",
            color: "#4ecdc4", fontStyle: "bold",
        }).setOrigin(0.5).setDepth(62);

        this.add.text(cx, panelY + 90, "You helped save Life Below Water", {
            fontFamily: "monospace", fontSize: "20px", color: "#aaddff",
        }).setOrigin(0.5).setDepth(62);

        for (let i = 0; i < 3; i++) {
            const g = this.add.graphics().setDepth(62);
            const filled = i < this.starsCollected;
            drawStar(g, cx - 60 + i * 60, panelY + 150, 20,
                filled ? 0xffe066 : 0x334466, filled ? 1 : 0.4, 0.5);
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
        this.add.text(cx, panelY + 205,
            `Time remaining: ${m}:${s.toString().padStart(2, "0")}`, {
            fontFamily: "monospace", fontSize: "16px", color: "#aaddff",
        }).setOrigin(0.5).setDepth(62);

        // --- Educational Content ---
        this.add.text(cx, panelY + 260, "How You Can Protect Life Below Water:", {
            fontFamily: "monospace", fontSize: "20px", color: "#4ecdc4", fontStyle: "bold"
        }).setOrigin(0.5).setDepth(62);

        const tips = [
            "Reduce single-use plastics and join local beach cleanups.",
            "Dispose of hazardous waste properly to prevent toxic runoff.",
            "Choose sustainable, ethically sourced seafood."
        ];

        tips.forEach((tip, index) => {
            const tipText = this.add.text(cx, panelY + 310 + (index * 35), `• ${tip}`, {
                fontFamily: "monospace", fontSize: "18px", color: "#cfe8b4", align: "center",
                wordWrap: { width: panelW - 40 }
            }).setOrigin(0.5).setDepth(62).setAlpha(0);

            // Gentle fade-in
            this.tweens.add({
                targets: tipText, alpha: 1, duration: 400, delay: 400 + index * 300
            });
        });
        // ---------------------------

        this.add.text(cx, panelY + panelH - 40, "Press SPACE or ESC to Exit", {
            fontFamily: "monospace", fontSize: "18px", color: "#4ecdc4", fontStyle: "bold"
        }).setOrigin(0.5).setDepth(63);

        this._spawnCelebration();
    }

    /**
     * Displays the game over screen.
     *
     * Informs the player that time ran out, shows the stars collected before
     * failing, and prompts them to exit the level.
     */
    showLoseOverlay() {
        const cx = this.scale.width / 2;
        const cy = this.scale.height / 2;

        const bg = this.add.graphics().setDepth(60);
        bg.fillStyle(0x06101e, 0.55);
        bg.fillRect(0, 0, this.scale.width, this.scale.height);

        const panelW = 440;
        const panelH = 340;
        const panelX = cx - panelW / 2;
        const panelY = cy - panelH / 2;

        const panel = this.add.graphics().setDepth(61);
        panel.fillStyle(0x020c18, 0.75);
        panel.fillRoundedRect(panelX, panelY, panelW, panelH, 20);
        panel.lineStyle(2, 0xff6666, 0.8);
        panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 20);

        this.add.text(cx, panelY + 50, "⏰ TIME'S UP!", {
            fontFamily: "monospace", fontSize: "28px",
            color: "#ff6666", fontStyle: "bold",
        }).setOrigin(0.5).setDepth(62);

        this.add.text(cx, panelY + 95, "The ocean still needs your help...", {
            fontFamily: "monospace", fontSize: "20px", color: "#aaddff",
        }).setOrigin(0.5).setDepth(62);

        this.add.text(cx, panelY + 140, "Stars collected:", {
            fontFamily: "monospace", fontSize: "18px", color: "#ffe066",
        }).setOrigin(0.5).setDepth(62);

        for (let i = 0; i < 3; i++) {
            const g = this.add.graphics().setDepth(62);
            const filled = i < this.starsCollected;
            drawStar(g, cx - 60 + i * 60, panelY + 190, 18,
                filled ? 0xffe066 : 0x334466, filled ? 1 : 0.35, 0.4);
        }

        // Clean instruction rather than the button
        this.add.text(cx, panelY + panelH - 40, "Press SPACE or ESC to Exit", {
            fontFamily: "monospace", fontSize: "18px", color: "#ff6666", fontStyle: "bold"
        }).setOrigin(0.5).setDepth(63);
    }

    /**
     * Creates a confetti-like particle effect.
     *
     * Spawns colored graphical circles that fall from the top of the screen
     * to celebrate level completion.
     */
    _spawnCelebration() {
        const colors = [0x4ecdc4, 0xffe066, 0xff6b9d, 0x88ccff, 0xaaffaa];
        for (let i = 0; i < 30; i++) {
            const p = this.add.graphics().setDepth(65);
            p.fillStyle(Phaser.Math.RND.pick(colors), 0.9);
            p.fillCircle(0, 0, Phaser.Math.Between(3, 7));
            p.setPosition(Phaser.Math.Between(0, this.scale.width), Phaser.Math.Between(-50, 0));
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

    // ── Pause Menu Overlay (Consistent with other levels) ────────────────────

    /**
     * Opens the pause menu.
     *
     * Halts gameplay mechanics and displays an overlay prompting the player
     * to either exit the level or resume.
     */
    openPauseMenu() {
        this.isPausedMenuOpen = true;
        this.paused = true;

        this.pauseDim = this.add.rectangle(
            this.scale.width / 2,
            this.scale.height / 2,
            this.scale.width,
            this.scale.height,
            0x000000,
            0.6
        ).setDepth(130);

        this.pauseBox = this.add.rectangle(
            this.scale.width / 2,
            this.scale.height / 2,
            500,
            150,
            0x111111,
            0.6
        ).setDepth(131).setRounded(20);

        this.pauseText = this.add.text(
            this.scale.width / 2,
            this.scale.height / 2 - 30,
            "Exit Level?\n",
            {
                fontSize: '32px',
                color: '#ffffff'
            }
        ).setOrigin(0.5).setDepth(132);

        this.pauseSubText = this.add.text(
            this.scale.width / 2,
            this.scale.height / 2 + 20,
            "Press Y to confirm\n\nPress N to cancel",
            {
                fontSize: '20px',
                color: '#cccccc',
                align: 'center'
            }
        ).setOrigin(0.5).setDepth(132);

        this.confirmKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Y);
        this.cancelKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.N);
    }

    /**
     * Closes the pause menu.
     *
     * Destroys the pause overlay elements and resumes active gameplay.
     */
    closePauseMenu() {
        this.isPausedMenuOpen = false;
        this.paused = false;

        this.pauseDim.destroy();
        this.pauseBox.destroy();
        this.pauseText.destroy();
        this.pauseSubText.destroy();
    }
}