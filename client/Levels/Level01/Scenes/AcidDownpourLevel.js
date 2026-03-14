import { GameFlowManager } from '../../../Core/GameFlowManager.js';
import { GameState } from '../../../Core/GameState.js';
import { saveProgress } from '../../../Core/api.js';

export class AcidDownpourLevel extends Phaser.Scene {

    constructor() {
        super('AcidDownpourLevel');

        this.idleTimer = null;
        this.jumpVelocity = -570;

        this.maxLives = 3;
        this.lives = 3;
        this.collectedStars = new Set();

        this.levers = [];
        this.leverStates = {};

        this.levelFinished = false;
        this.isGameOver = false;
        this.isPausedMenuOpen = false;
    }

    init(data) {
        if (data?.isRespawn) {
            // Respawn case
            this.lives = data.lives;
            this.collectedStars = new Set(data.collectedStars || []);
            this.leverStates = data.leverStates || {};
        } else {
            // Fresh start from Entry
            this.lives = this.maxLives;
            this.collectedStars = new Set();
            this.leverStates = {};
        }
    }

    preload() {
        this.load.image('Level01Background', './client/Levels/Level01/Assets/Backgrounds/Thailand_Backdrop.png');
        this.load.image('GenericBackground', './client/Levels/Level01/Assets/Backgrounds/Generic_Forrest_Background.png');

        this.load.image('green_front', './client/Levels/Level01/Assets/Player/greenfront.png');
        this.load.image('green_left', './client/Levels/Level01/Assets/Player/greenleft.png');
        this.load.image('green_right', './client/Levels/Level01/Assets/Player/greenright.png');

        // Walking frames
        this.load.image('green_left_walk1', './client/Levels/Level01/Assets/Player/greenleftwalk1.png');
        this.load.image('green_left_walk2', './client/Levels/Level01/Assets/Player/greenleftwalk2.png');

        this.load.image('green_right_walk1', './client/Levels/Level01/Assets/Player/greenrightwalk1.png');
        this.load.image('green_right_walk2', './client/Levels/Level01/Assets/Player/greenrightwalk2.png');

        // ===== Platforms =====
        this.load.image(
            'platform_medium_1',
            './client/Levels/Level01/Assets/Tileset/mediumPlatform1.png'
        );

        this.load.image(
            'platform_medium_2',
            './client/Levels/Level01/Assets/Tileset/mediumPlatform2.png'
        );

        this.load.image(
            'platform_n',
            './client/Levels/Level01/Assets/Tileset/nPlatform.png'
        );

        this.load.image(
            'platform_piece',
            './client/Levels/Level01/Assets/Tileset/piecePlatform.png'
        );

        this.load.image(
            'platform_right_angle',
            './client/Levels/Level01/Assets/Tileset/rightAnglePlatform.png'
        );

        this.load.image(
            'platform_square',
            './client/Levels/Level01/Assets/Tileset/squarePlatform.png'
        );

        this.load.image(
            'platform_trapezium_1',
            './client/Levels/Level01/Assets/Tileset/trapeziumPlatform1.png'
        );

        this.load.image(
            'platform_trapezium_2',
            './client/Levels/Level01/Assets/Tileset/trapeziumPlatform2.png'
        );

        this.load.image(
            'platform_long_1',
            './client/Levels/Level01/Assets/Tileset/longPlatform1.png'
        );

        this.load.image(
            'platform_long_2',
            './client/Levels/Level01/Assets/Tileset/longPlatform2.png'
        );

        this.load.image(
            'platform_long_rectangle',
            './client/Levels/Level01/Assets/Tileset/longRectanglePlatform.png'
        );

        this.load.image(
            'star_item',
            './client/Levels/Level01/Assets/Items/Star_to_collect.png'
        );

        this.load.image(
            'acid_wave',
            './client/Levels/Level01/Assets/InteractableAssets/acid_wave.png'
        );

        this.load.image(
            'score_board',
            './client/Levels/Level01/Assets/Items/score_board.png'
        );

        this.load.image(
            'hearts_health',
            './client/Levels/Level01/Assets/Items/heart_graphic.png'
        );

        this.load.image(
            'push_button',
            './client/Levels/Level01/Assets/InteractableAssets/push_button.png'
        );

        this.load.image(
            'lever_up',
            './client/Levels/Level01/Assets/InteractableAssets/lever_up.png'
        );

        this.load.image(
            'lever_down',
            './client/Levels/Level01/Assets/InteractableAssets/lever_down.png'
        );

        this.load.image(
            'star_filled',
            './client/Levels/Level01/Assets/Items/FilledStar.png'
        );

        this.load.image(
            'star_unfilled',
            './client/Levels/Level01/Assets/Items/UnfilledStar.png'
        );
    }

    create() {
        console.log("LIVES IN CREATE:", this.lives);
        this.levelFinished = false;
        this.isGameOver = false;
        this.isDying = false;
        this.levers = [];

        this.physics.resume();
        this.input.keyboard.resetKeys();
        this.isPausedMenuOpen = false;
        this.progressSaved = false;

        this.physics.world.gravity.y = 1200;
        const bg = this.add.image(0, 0, 'Level01Background').setOrigin(0, 0);
        bg.setDisplaySize(this.scale.width, this.scale.height);
        const walkAnimationRate = 8;

        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

        if (!this.anims.exists('walk_left')) {
            this.anims.create({
                key: 'walk_left',
                frames: [
                    { key: 'green_left_walk1' },
                    { key: 'green_left' },
                    { key: 'green_left_walk2' }
                ],
                frameRate: walkAnimationRate,
                repeat: -1
            });
        }

        if (!this.anims.exists('walk_right')) {
            this.anims.create({
                key: 'walk_right',
                frames: [
                    { key: 'green_right_walk1' },
                    { key: 'green_right' },
                    { key: 'green_right_walk2' }
                ],
                frameRate: walkAnimationRate,
                repeat: -1
            });
        }

        this.createPlayer();
        this.createBoundary();
        this.createPlatforms();
        this.physics.add.collider(this.player, this.platforms);

        this.platformMap['secret-platform-1'].setVisible(false);
        this.platformMap['secret-platform-1'].body.enable = false;

        this.platformMap['secret-platform-2'].setVisible(false);
        this.platformMap['secret-platform-2'].body.enable = false;

        this.createCollectables();
        this.physics.add.overlap(this.player, this.stars, this.collectStar, null, this);

        this.createAcid();
        this.physics.add.overlap(this.player, this.acidGroup, this.hitAcid, null, this);

        this.loadBoard();
        this.updateHearts();
        this.createButtons();
        this.createLevers();
    }

    update() {
        if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
            if (!this.isPausedMenuOpen && !this.levelFinished && !this.isGameOver) {
                this.openPauseMenu();
                return;
            }

            if (this.isGameOver || this.levelFinished) {

                this.scene.start('Level01EntryScene');
                return;
            }
        }

        if (this.isPausedMenuOpen) {

            if (Phaser.Input.Keyboard.JustDown(this.confirmKey)) {
                this.physics.resume();
                this.isPausedMenuOpen = false;
                this.scene.start('Level01EntryScene');
                return;
            }

            if (Phaser.Input.Keyboard.JustDown(this.cancelKey)) {
                this.closePauseMenu();
                return;
            }

            return;
        }

        if (this.levelFinished) {
            return;
        }

        this.handleMovement();
        this.checkButtonActivation();
        this.updateButtonVisuals();
    }

    createPlayer() {
        this.player = this.physics.add.sprite(140, 800, 'green_front');

        this.player.setScale(3);
        this.player.body.setSize(
            this.player.width * 0.4, // Ideal value is 0.6
            this.player.height * 0.8
        );

        this.player.body.setOffset(
            this.player.width * 0.35,
            this.player.height * 0.2
        );
        this.player.setCollideWorldBounds(true);

        this.player.setBounce(0.1);
        this.player.setGravityY(0);
        this.player.setMaxVelocity(400, 1000);

        this.cursors = this.input.keyboard.createCursorKeys();
    }

    handleMovement() {
        const speed = 200;
        this.player.setVelocityX(0);

        if (this.cursors.left.isDown) {
            this.moveLeft(speed);
        }
        else if (this.cursors.right.isDown) {
            this.moveRight(speed);
        }

        if (this.cursors.up.isDown && this.player.body.blocked.down) {
            this.player.setVelocityY(this.jumpVelocity);
        }
        if (!this.cursors.left.isDown && !this.cursors.right.isDown) {
            this.player.anims.stop();

            if (!this.idleTimer) {
                this.idleTimer = this.time.delayedCall(50, () => {
                    this.player.setTexture('green_front');
                    this.idleTimer = null;
                });
            }
        }
    }

    moveLeft(speed) {
        if (this.idleTimer) {
            this.idleTimer.remove();
            this.idleTimer = null;
        }

        this.player.setVelocityX(-speed);
        this.player.anims.play('walk_left', true);
    }

    moveRight(speed) {
        if (this.idleTimer) {
            this.idleTimer.remove();
            this.idleTimer = null;
        }
        this.player.setVelocityX(speed);
        this.player.anims.play('walk_right', true);
    }

    createBoundary() {
        const groundHeight = 75;
        const ceilingHeight = 65;
        const rightWallWidth = 40;
        const leftWallWidth = 72;
        const transparencyValue = 0;

        const ground = this.add.rectangle(
            this.scale.width / 2,
            this.scale.height - groundHeight / 2,
            this.scale.width,
            groundHeight,
            0x00ff00
        ).setAlpha(transparencyValue);

        const ceiling = this.add.rectangle(
            this.scale.width / 2,
            ceilingHeight / 2,
            this.scale.width,
            ceilingHeight,
            0xff0000
        ).setAlpha(transparencyValue);

        const leftWall = this.add.rectangle(
            leftWallWidth / 2,
            this.scale.height / 2,
            leftWallWidth,
            this.scale.height,
            0x0000ff
        ).setAlpha(transparencyValue);

        const rightWall = this.add.rectangle(
            this.scale.width - rightWallWidth / 2,
            this.scale.height / 2,
            rightWallWidth,
            this.scale.height,
            0xffff00
        ).setAlpha(transparencyValue);

        this.physics.add.existing(ground, true);
        this.physics.add.existing(ceiling, true);
        this.physics.add.existing(leftWall, true);
        this.physics.add.existing(rightWall, true);

        this.physics.add.collider(this.player, ground);
        this.physics.add.collider(this.player, ceiling);
        this.physics.add.collider(this.player, leftWall);
        this.physics.add.collider(this.player, rightWall);
    }

    createPlatforms() {
        this.platforms = this.physics.add.staticGroup();
        this.platformMap = {};

        const layout = [
            { x: 250, y: 960, key: 'platform_medium_2', scale: 1, flipX: false },
            { x: 670, y: 960, key: 'platform_trapezium_1', scale: 1, flipX: true },
            { x: 990, y: 900, key: 'platform_piece', scale: 1.25, flipX: false },
            { x: 1400, y: 960, key: 'platform_medium_2', scale: 1, flipX: false },
            { x: 1800, y: 960, key: 'platform_square', scale: 1, flipX: false },
            { x: 1410, y: 720, key: 'platform_medium_1', scale: 0.7, flipX: false },
            { x: 1660, y: 830, key: 'platform_piece', scale: 1, flipX: false, id: "secret-platform-1" },
            { x: 1150, y: 600, key: 'platform_square', scale: 0.7, flipX: false },
            { x: 930, y: 480, key: 'platform_square', scale: 0.7, flipX: false },
            { x: 380, y: 520, key: 'platform_long_2', scale: 1, flipX: true },
            { x: 250, y: 250, key: 'platform_medium_2', scale: 1, flipX: false },
            { x: 1700, y: 250, key: 'platform_medium_2', scale: 1, flipX: false },
            { x: 550, y: 330, key: 'platform_piece', scale: 0.8, flipX: false },
            { x: 1380, y: 480, key: 'platform_square', scale: 0.7, flipX: false },
            { x: 1480, y: 360, key: 'platform_piece', scale: 0.8, flipX: false, id: "secret-platform-2" }
        ];

        layout.forEach(p => {
            const platform = this.platforms.create(p.x, p.y, p.key);
            platform.setScale(p.scale).setFlipX(p.flipX).refreshBody();
            platform.setDepth(1);

            if (p.id) {
                this.platformMap[p.id] = platform;
            }
        });
    }

    createCollectables() {
        this.stars = this.physics.add.group();

        const layout = [
            { x: 150, y: 415 },
            { x: 930, y: 420 },
            { x: 1400, y: 660 }
        ];

        layout.forEach((s, index) => {

            if (this.collectedStars.has(index)) return;

            const star = this.stars.create(s.x, s.y, 'star_item');
            star.setScale(0.07);
            star.body.setAllowGravity(false);

            star.starId = index;
        });
    }

    collectStar(player, star) {
        star.disableBody(true, true);
        this.collectedStars.add(star.starId);
        console.log("Stars:", this.collectedStars.size);
    }

    createAcid() {
        this.acidGroup = this.physics.add.staticGroup();

        const acidWidth = 400;
        const acidY = this.scale.height - 70;

        for (let x = 80; x < this.scale.width; x += acidWidth) {
            const acid = this.acidGroup.create(x, acidY, 'acid_wave')
                .setOrigin(0, 1);
            acid.setDepth(0);
            acid.setScale(0.8);
            acid.setAlpha(0.6);
            this.lastAcid = acid;
            acid.refreshBody();
        }

        const remainingWidth = this.scale.width - this.lastAcid.x - 50;

        this.lastAcid.setCrop(0, 0, remainingWidth / 0.8, this.lastAcid.height);
        this.lastAcid.refreshBody();
    }

    hitAcid(player, acid) {
        if (this.isDying) return;
        this.isDying = true;

        console.log("Player touched acid!");

        player.setTint(0xff0000);

        this.lives--;

        this.updateHearts();

        this.time.delayedCall(600, () => {

            if (this.lives <= 0) {
                this.gameOver();
            } else {
                this.scene.restart({
                    lives: this.lives,
                    collectedStars: Array.from(this.collectedStars),
                    leverStates: this.leverStates,
                    isRespawn: true
                });
            }

        });
    }

    loadBoard() {
        const board = this.add.image(this.scale.width / 2 - 60, 60, 'score_board').setOrigin(0, 0);
        board.setAlpha(0.8);

        this.heartIcons = [];

        const startX = board.x + 45;
        const startY = board.y + 20;
        const spacing = 45;

        for (let i = 0; i < this.maxLives; i++) {
            const heart = this.add.image(startX + i * spacing, startY, 'hearts_health')
                .setScale(0.3)
                .setOrigin(0, 0);

            this.heartIcons.push(heart);
        }
    }

    updateHearts() {

        for (let i = 0; i < this.maxLives; i++) {

            if (i >= this.lives) {
                this.heartIcons[i].setTint(0x000000); // black heart
            }
        }
    }

    createButtons() {
        this.buttons = [];

        const layout = [
            { x: 80, y: 380, id: "secret-platform-2", flipX: true },
            { x: this.scale.width - 55, y: 860, id: "secret-platform-1", flipX: false }
        ];

        layout.forEach(b => {
            const button = this.add.image(b.x, b.y, 'push_button')
                .setScale(0.5)
                .setDepth(2)
                .setAlpha(0.7);

            button.secretId = b.id;
            button.setFlipX(b.flipX);

            this.buttons.push(button);
        });
    }

    checkButtonActivation() {
        if (this.levelFinished || this.isGameOver) return;
        if (!Phaser.Input.Keyboard.JustDown(this.spaceKey)) return;

        this.buttons.forEach(button => {

            const distance = Phaser.Math.Distance.Between(
                this.player.x,
                this.player.y,
                button.x,
                button.y
            );

            if (distance < 80) { // ~10cm in game terms
                this.activatePlatform(button.secretId);
            }
        });

        this.levers.forEach(lever => {

            const distance = Phaser.Math.Distance.Between(
                this.player.x,
                this.player.y,
                lever.x,
                lever.y
            );

            if (distance < 80) {
                this.toggleLever(lever);
            }
        });
    }

    updateButtonVisuals() {

        this.buttons.forEach(button => {

            const distance = Phaser.Math.Distance.Between(
                this.player.x,
                this.player.y,
                button.x,
                button.y
            );

            if (distance < 80) {

                if (!button.isPulsing) {
                    button.isPulsing = true;

                    button.pulseTween = this.tweens.add({
                        targets: button,
                        alpha: { from: 1, to: 0.6 },
                        duration: 600,
                        yoyo: true,
                        repeat: -1
                    });
                }

            } else {

                if (button.isPulsing) {
                    button.isPulsing = false;

                    button.setAlpha(0.7);

                    if (button.pulseTween) {
                        button.pulseTween.stop();
                    }
                }
            }
        });
    }

    activatePlatform(id) {

        const platform = this.platformMap[id];
        if (!platform) return;

        const isActive = platform.visible;

        if (!isActive) {

            // ===== TURN ON =====
            platform.setVisible(true);
            platform.body.enable = true;

            platform.setAlpha(0);

            const originalScaleX = platform.scaleX;
            const originalScaleY = platform.scaleY;

            platform.setScale(originalScaleX * 0.9, originalScaleY * 0.9);

            this.tweens.add({
                targets: platform,
                alpha: 1,
                scaleX: originalScaleX,
                scaleY: originalScaleY,
                duration: 250,
                ease: 'Back.easeOut'
            });

        } else {

            // ===== TURN OFF =====
            platform.body.enable = false;

            this.tweens.add({
                targets: platform,
                alpha: 0,
                duration: 250,
                ease: 'Sine.easeInOut',
                onComplete: () => {
                    platform.setVisible(false);
                }
            });
        }

        console.log("Toggled:", id);
    }

    createLevers() {

        const layout = [
            { x: 80, y: this.scale.height - 930, id: "leftLever", flipX: false },
            { x: this.scale.width - 65, y: this.scale.height - 930, id: "rightLever", flipX: true }
        ];

        layout.forEach(l => {

            const lever = this.add.image(l.x, l.y, 'lever_up')
                .setScale(0.5)
                .setDepth(2)
                .setFlipX(l.flipX)
                .setAlpha(0.7);

            lever.leverId = l.id;

            if (this.leverStates[l.id] === undefined) {
                this.leverStates[l.id] = false;
            }

            if (this.leverStates[l.id]) {
                lever.setTexture('lever_down');
            }

            this.levers.push(lever);
        });
    }

    toggleLever(lever) {
        if (!lever || !lever.scene || this.levelFinished) return;
        const id = lever.leverId;
        const isDown = this.leverStates[id];

        if (!isDown) {
            lever.setTexture('lever_down');
            this.leverStates[id] = true;
        } else {
            lever.setTexture('lever_up');
            this.leverStates[id] = false;
        }

        this.checkLevelCompletion();
    }

    checkLevelCompletion() {

        const allDown = Object.values(this.leverStates).every(state => state === true);

        if (allDown && !this.levelFinished) {
            this.levelFinished = true;
            this.physics.pause();     
            this.saveLevelProgress();
            this.showEndOverlay();
        }
    }

    showEndOverlay() {

        // Dim background
        this.endDim = this.add.rectangle(
            this.scale.width / 2,
            this.scale.height / 2,
            this.scale.width,
            this.scale.height,
            0x000000,
            0.5
        ).setDepth(21);

        this.endPanel = this.add.image(
            0,
            0,
            'GenericBackground'
        ).setDepth(20)
            .setOrigin(0, 0);

        this.endPanel.setDisplaySize(this.scale.width, this.scale.height);

        // Stats text
        this.add.text(
            this.scale.width / 2,
            this.scale.height / 2 - 140,
            "LEVEL COMPLETE",
            {
                fontSize: '42px',
                color: '#cfe8d4'
            }
        ).setOrigin(0.5).setDepth(22);

        // Stars Label
        this.add.text(
            this.scale.width / 2,
            this.scale.height / 2 - 80,
            "Stars Collected",
            {
                fontSize: '26px',
                color: '#ffffff'
            }
        ).setOrigin(0.5).setDepth(22);

        // Star UI
        const totalStars = 3;
        const starSpacing = 70;
        const startX = this.scale.width / 2 - starSpacing;
        const starY = this.scale.height / 2 - 30;

        for (let i = 0; i < totalStars; i++) {
            const texture = i < this.collectedStars.size
                ? 'star_filled'
                : 'star_unfilled';

            const star = this.add.image(
                startX + i * starSpacing,
                starY,
                texture
            )
                .setScale(0.08)
                .setDepth(22);

            this.tweens.add({
                targets: star,
                alpha: 1,
                scale: { from: 0.04, to: 0.08 },
                duration: 300,
                delay: i * 200,
                ease: 'Back.easeOut'
            });
        }

        // Lives Remaining
        this.add.text(
            this.scale.width / 2,
            this.scale.height / 2 + 40,
            `Lives Remaining: ${this.lives}`,
            {
                fontSize: '24px',
                color: '#ffffff'
            }
        ).setOrigin(0.5).setDepth(22);

        // Educational tips
        this.add.text(
            this.scale.width / 2,
            this.scale.height / 2 + 90,
            "How to Reduce Acid Rain",
            {
                fontSize: '24px',
                color: '#cfe8b4'
            }
        ).setOrigin(0.5).setDepth(22);

        const tips = [
            "Use public transport or carpool to reduce vehicle emissions",
            "Choose renewable energy options when available",
            "Buy products from companies with clean manufacturing practices"
        ];

        tips.forEach((tip, index) => {

            const tipText = this.add.text(
                this.scale.width / 2,
                this.scale.height / 2 + 130 + index * 35,
                `• ${tip}`,
                {
                    fontSize: '22px',
                    color: '#cfe8b4'
                }
            )
                .setOrigin(0.5)
                .setDepth(22)
                .setAlpha(0);

            // Gentle fade-in
            this.tweens.add({
                targets: tipText,
                alpha: 1,
                duration: 400,
                delay: 400 + index * 300
            });
        });

        this.exitTextEnd = this.add.text(
            this.scale.width / 2,
            this.scale.height / 2 + 240,
            "Press Esc to Exit",
            {
                fontSize: '20px',
                color: '#ffffff'
            }
        ).setOrigin(0.5).setDepth(22);

        // Fade-in animation
        this.endPanel.setAlpha(0);
        this.exitTextEnd.setAlpha(0);

        this.tweens.add({
            targets: [this.endPanel, this.endStats, this.endTips, this.exitTextEnd],
            alpha: 1,
            duration: 400,
            ease: 'Sine.easeOut'
        });
    }

    showGameOverOverlay() {

        this.endDim = this.add.rectangle(
            this.scale.width / 2,
            this.scale.height / 2,
            this.scale.width,
            this.scale.height,
            0x000000,
            0.75
        ).setDepth(21);

        this.gameOverPanel = this.add.image(
            0,
            0,
            'GenericBackground'
        ).setDepth(20)
            .setOrigin(0, 0);

        this.gameOverPanel.setDisplaySize(this.scale.width, this.scale.height);

        // Title text
        this.gameOverTitle = this.add.text(
            this.scale.width / 2,
            this.scale.height / 2 - 90,
            "GAME OVER",
            {
                fontSize: '42px',
                color: '#759116'
            }
        ).setOrigin(0.5).setDepth(22);

        // Stats
        this.starLabel = this.add.text(
            this.scale.width / 2,
            this.scale.height / 2 - 10,
            "Stars Collected:",
            {
                fontSize: '26px',
                color: '#ffffff'
            }
        ).setOrigin(0.5).setDepth(22);

        // Star icons
        this.gameOverStars = [];

        const totalStars = 3;
        const spacing = 70;
        const startX = this.scale.width / 2 - spacing;

        for (let i = 0; i < totalStars; i++) {

            const textureKey =
                i < this.collectedStars.size
                    ? 'star_filled'
                    : 'star_unfilled';

            const star = this.add.image(
                startX + i * spacing,
                this.scale.height / 2 + 40,
                textureKey
            )
                .setScale(0.08)
                .setDepth(22)
                .setAlpha(0);

            this.gameOverStars.push(star);
        }

        this.exitText = this.add.text(
            this.scale.width / 2,
            this.scale.height / 2 + 120,
            "Press Esc to Exit",
            {
                fontSize: '20px',
                color: '#ffffff'
            }
        ).setOrigin(0.5).setDepth(22);

        this.gameOverPanel.setAlpha(0);
        this.gameOverTitle.setAlpha(0);
        this.starLabel.setAlpha(0);
        this.exitText.setAlpha(0);

        this.tweens.add({
            targets: [
                this.gameOverPanel,
                this.gameOverTitle,
                this.starLabel,
                ...this.gameOverStars,
                this.exitText
            ],
            alpha: 1,
            duration: 500,
            ease: 'Sine.easeOut'
        });
    }

    openPauseMenu() {
        this.isPausedMenuOpen = true;
        this.physics.pause();

        // Dark overlay
        this.pauseDim = this.add.rectangle(
            this.scale.width / 2,
            this.scale.height / 2,
            this.scale.width,
            this.scale.height,
            0x000000,
            0.6
        ).setDepth(30);

        // Panel box
        this.pauseBox = this.add.rectangle(
            this.scale.width / 2,
            this.scale.height / 2,
            500,
            250,
            0x111111,
            0.9
        ).setDepth(31);

        // Text
        this.pauseText = this.add.text(
            this.scale.width / 2,
            this.scale.height / 2 - 40,
            "Exit Level?",
            {
                fontSize: '32px',
                color: '#ffffff'
            }
        ).setOrigin(0.5).setDepth(32);

        this.pauseSubText = this.add.text(
            this.scale.width / 2,
            this.scale.height / 2 + 10,
            "Press Y to confirm\nPress N to cancel",
            {
                fontSize: '20px',
                color: '#cccccc',
                align: 'center'
            }
        ).setOrigin(0.5).setDepth(32);

        // Keys
        this.confirmKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Y);
        this.cancelKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.N);
    }

    closePauseMenu() {

        this.isPausedMenuOpen = false;

        this.pauseDim.destroy();
        this.pauseBox.destroy();
        this.pauseText.destroy();
        this.pauseSubText.destroy();

        this.physics.resume();
    }

    async saveLevelProgress() {
        if (this.progressSaved) return;

        try {
            await saveProgress(
                GameState.userId,
                'level01',
                this.collectedStars.size
            );

            this.progressSaved = true;
            console.log("Progress saved successfully");

        } catch (err) {
            console.error("Failed to save progress:", err);
        }
    }

    gameOver() {
        console.log("GAME OVER");

        this.isGameOver = true;
        this.levelFinished = true;

        this.physics.pause();
        this.player.setTint(0x000000);

        this.showGameOverOverlay();
    }
} 