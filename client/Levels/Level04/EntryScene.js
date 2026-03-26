import { GameFlowManager } from '../../Core/GameFlowManager.js';

export class Level04EntryScene extends Phaser.Scene {
    constructor() {
        super('Level04EntryScene');
    }

    create() {
        this.generateTextures();

        // Background
        this.add.rectangle(960, 540, 1920, 1080, 0x050520);

        // Starfield
        for (let i = 0; i < 120; i++) {
            this.add.circle(
                Phaser.Math.Between(0, 1920),
                Phaser.Math.Between(0, 1080),
                Phaser.Math.FloatBetween(0.5, 2),
                0xffffff,
                Phaser.Math.FloatBetween(0.2, 0.8)
            );
        }

        // Level title
        this.add.text(960, 280, 'LEVEL 04', {
            fontSize: '36px',
            fontFamily: 'Arial',
            color: '#6688cc',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(960, 360, 'SPACE JUNK', {
            fontSize: '80px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold',
            stroke: '#3366aa',
            strokeThickness: 4
        }).setOrigin(0.5);

        this.add.text(960, 460, 'Ozone Layer Depletion', {
            fontSize: '28px',
            fontFamily: 'Arial',
            color: '#66aaff',
            fontStyle: 'italic'
        }).setOrigin(0.5);

        this.add.text(960, 540, 'Clear the debris from Earth\'s orbit to restore\nthe ozone layer and protect life below.', {
            fontSize: '22px',
            fontFamily: 'Arial',
            color: '#aaaacc',
            align: 'center',
            lineSpacing: 8
        }).setOrigin(0.5);

        // Controls info
        this.add.text(960, 660, 'CONTROLS', {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#ffdd00',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(960, 710, 'Arrow Keys — Move Ship\nSPACE — Shoot Laser', {
            fontSize: '20px',
            fontFamily: 'Arial',
            color: '#cccccc',
            align: 'center',
            lineSpacing: 6
        }).setOrigin(0.5);

        // Start prompt
        const startText = this.add.text(960, 850, '[ Press SPACE to begin ]', {
            fontSize: '32px',
            fontFamily: 'Arial',
            color: '#ffdd00',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.tweens.add({
            targets: startText,
            alpha: 0.3,
            duration: 800,
            yoyo: true,
            repeat: -1
        });

        this.input.keyboard.once('keydown-SPACE', () => {
            this.scene.start('Level04CutsceneScene');
        });

        this.input.keyboard.once('keydown-ESC', () => {
            GameFlowManager.goToLevelSelect(this);
        });
    }

    generateTextures() {
        // Ship
        let g = this.make.graphics({ add: false });
        g.fillStyle(0x2266cc);
        g.fillTriangle(30, 0, 5, 55, 55, 55);
        g.fillStyle(0x3399ff);
        g.fillTriangle(30, 5, 12, 50, 48, 50);
        g.fillStyle(0x88ccff);
        g.fillCircle(30, 28, 7);
        g.fillStyle(0x1a4f99);
        g.fillTriangle(5, 40, -8, 58, 12, 55);
        g.fillTriangle(55, 40, 68, 58, 48, 55);
        g.fillStyle(0xff6600);
        g.fillRect(20, 53, 20, 8);
        g.fillStyle(0xffaa00);
        g.fillRect(24, 55, 12, 6);
        g.generateTexture('l4_ship', 60, 61);
        g.destroy();

        // Bullet
        g = this.make.graphics({ add: false });
        g.fillStyle(0xffff44);
        g.fillRect(0, 0, 4, 18);
        g.fillStyle(0xffffff);
        g.fillRect(1, 0, 2, 18);
        g.generateTexture('l4_bullet', 4, 18);
        g.destroy();

        // Small debris
        g = this.make.graphics({ add: false });
        g.fillStyle(0x888888);
        g.fillCircle(12, 12, 12);
        g.fillStyle(0x666666);
        g.fillCircle(7, 7, 5);
        g.fillStyle(0xaaaaaa);
        g.fillCircle(16, 10, 3);
        g.generateTexture('l4_debris_small', 24, 24);
        g.destroy();

        // Medium debris
        g = this.make.graphics({ add: false });
        g.fillStyle(0x556677);
        g.fillRect(0, 0, 44, 28);
        g.fillStyle(0x445566);
        g.fillRect(2, 2, 40, 24);
        g.fillStyle(0x778899);
        g.fillRect(8, 8, 28, 12);
        g.fillStyle(0x334455);
        g.fillRect(18, 4, 8, 20);
        g.generateTexture('l4_debris_medium', 44, 28);
        g.destroy();

        // Large debris (satellite)
        g = this.make.graphics({ add: false });
        g.fillStyle(0x667788);
        g.fillRect(14, 8, 36, 28);
        g.fillStyle(0x3355aa);
        g.fillRect(0, 12, 16, 20);
        g.fillRect(48, 12, 16, 20);
        g.fillStyle(0x4466bb);
        g.fillRect(2, 14, 12, 16);
        g.fillRect(50, 14, 12, 16);
        g.fillStyle(0x8899aa);
        g.fillCircle(32, 22, 6);
        g.generateTexture('l4_debris_large', 64, 44);
        g.destroy();

        // Star collectible
        g = this.make.graphics({ add: false });
        g.fillStyle(0xffdd00);
        const cx = 18, cy = 18, outerR = 18, innerR = 8;
        const points = [];
        for (let i = 0; i < 10; i++) {
            const r = i % 2 === 0 ? outerR : innerR;
            const angle = (Math.PI / 5) * i - Math.PI / 2;
            points.push(new Phaser.Geom.Point(
                cx + Math.cos(angle) * r,
                cy + Math.sin(angle) * r
            ));
        }
        g.fillPoints(points, true);
        g.fillStyle(0xffee66);
        const innerPoints = [];
        for (let i = 0; i < 10; i++) {
            const r = i % 2 === 0 ? outerR * 0.6 : innerR * 0.6;
            const angle = (Math.PI / 5) * i - Math.PI / 2;
            innerPoints.push(new Phaser.Geom.Point(
                cx + Math.cos(angle) * r,
                cy + Math.sin(angle) * r
            ));
        }
        g.fillPoints(innerPoints, true);
        g.generateTexture('l4_star', 36, 36);
        g.destroy();
    }
}
