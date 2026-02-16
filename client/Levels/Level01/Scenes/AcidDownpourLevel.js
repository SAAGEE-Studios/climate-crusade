import { GameFlowManager } from '../../../Core/GameFlowManager.js';
import { GameState } from '../../../Core/GameState.js';

export class AcidDownpourLevel extends Phaser.Scene {

    constructor() {
        super('AcidDownpourLevel');

        this.idleTimer = null;
        this.jumpVelocity = -570;
    }

    preload() {
        this.load.image('Level01Background', './client/Levels/Level01/Assets/Backgrounds/Thailand_Backdrop.png');

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

    }

    create() {
        this.physics.world.gravity.y = 1200;
        const bg = this.add.image(0, 0, 'Level01Background').setOrigin(0, 0);
        bg.setDisplaySize(this.scale.width, this.scale.height);
        const walkAnimationRate = 8;

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

        this.createPlayer();
        this.createBoundary();
        this.createPlatforms();
        this.physics.add.collider(this.player, this.platforms);

        this.platformMap['secret-platform-1'].setVisible(false);
        this.platformMap['secret-platform-1'].body.enable = false;

        this.platformMap['secret-platform-2'].setVisible(false);
        this.platformMap['secret-platform-2'].body.enable = false;
    }

    update() {
        this.handleMovement();
    }

    createPlayer() {
        this.player = this.physics.add.sprite(1800, 800, 'green_front');

        this.player.setScale(3);
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
            { x: 250, y: 960, key: 'platform_medium_2', scale: 1, flipX: false},
            { x: 670, y: 960, key: 'platform_trapezium_1', scale: 1, flipX: true},
            { x: 990, y: 900, key: 'platform_piece', scale: 1.25, flipX: false},
            { x: 1400, y: 960, key: 'platform_medium_2', scale: 1, flipX: false},
            { x: 1800, y: 960, key: 'platform_square', scale: 1, flipX: false},
            { x: 1410, y: 720, key: 'platform_medium_1', scale: 0.7, flipX: false},
            { x: 1660, y: 830, key: 'platform_piece', scale: 1, flipX: false, id: "secret-platform-1"},
            { x: 1150, y: 600, key: 'platform_square', scale: 0.7, flipX: false},
            { x: 930, y: 480, key: 'platform_square', scale: 0.7, flipX: false},
            { x: 380, y: 520, key: 'platform_long_2', scale: 1, flipX: true},
            { x: 250, y: 250, key: 'platform_medium_2', scale: 1, flipX: false},
            { x: 1700, y: 250, key: 'platform_medium_2', scale: 1, flipX: false},
            { x: 550, y: 330, key: 'platform_piece', scale: 0.8, flipX: false},
            { x: 1380, y: 480, key: 'platform_square', scale: 0.7, flipX: false},
            { x: 1480, y: 360, key: 'platform_piece', scale: 0.8, flipX: false, id: "secret-platform-2"}
        ];

        layout.forEach(p => {
            const platform = this.platforms.create(p.x, p.y, p.key);
            platform.setScale(p.scale).setFlipX(p.flipX).refreshBody();

             if (p.id) {
                this.platformMap[p.id] = platform;
            }
        });
    } 

}