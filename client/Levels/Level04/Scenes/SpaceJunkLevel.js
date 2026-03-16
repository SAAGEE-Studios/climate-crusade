import { GameFlowManager } from '../../../Core/GameFlowManager.js';
import { GameState } from '../../../Core/GameState.js';
import { saveProgress } from '../../../Core/api.js';

export class SpaceJunkLevel extends Phaser.Scene {
    constructor() {
        super('Level04_GameplayScene');

        this.isPausedMenuOpen = false;
    }

    init() {
        this.score = 0;
        this.health = 100;
        this.starsCollected = 0;
        this.currentWave = 0;
        this.maxWaves = 3;
        this.gameOver = false;
        this.levelComplete = false;
        this.lastFired = 0;
        this.fireRate = 150;
        this.shipSpeed = 500;
        this.bgStars = [];
        this.debrisDestroyed = 0;
        this.waveActive = false;
        this.spawnTimer = null;
        this.isPaused = false;

        this.waveConfigs = [
            { spawnRate: 2800, duration: 22000, types: ['small', 'medium'] },
            { spawnRate: 2000, duration: 24000, types: ['small', 'medium', 'large'] },
            { spawnRate: 1300, duration: 26000, types: ['small', 'medium', 'large'] }
        ];

        this.educationalFacts = [
            "Over 36,000 pieces of debris larger than 10cm orbit Earth.\nEven tiny fragments travel at 28,000 km/h — fast enough to destroy spacecraft.",
            "Rocket launches release chlorine and alumina into the stratosphere,\ndirectly damaging the ozone layer that shields us from UV radiation.",
            "By clearing space junk and developing cleaner launch technologies,\nwe can protect both astronauts and Earth's vital ozone shield."
        ];
    }

    create() {
        this.add.rectangle(960, 540, 1920, 1080, 0x050520).setDepth(0);
        this.confirmKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Y);
        this.cancelKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.N);
        this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

        this.createStarfield();

        this.earthGlow = this.add.circle(960, 1150, 200, 0x2244aa, 0.15).setDepth(1);

        this.ship = this.physics.add.sprite(960, 880, 'l4_ship');
        this.ship.setCollideWorldBounds(true);
        this.ship.setDepth(10);

        this.thruster = this.add.circle(this.ship.x, this.ship.y + 33, 8, 0xff6600, 0.6).setDepth(9);
        this.tweens.add({
            targets: this.thruster,
            scaleX: { from: 0.7, to: 1.3 },
            scaleY: { from: 0.8, to: 1.4 },
            alpha: { from: 0.4, to: 0.8 },
            duration: 80,
            yoyo: true,
            repeat: -1
        });

        this.bullets = this.physics.add.group();
        this.debris = this.physics.add.group();
        this.collectibleStars = this.physics.add.group();

        this.physics.add.overlap(this.bullets, this.debris, this.hitDebris, null, this);
        this.physics.add.overlap(this.ship, this.debris, this.shipHitDebris, null, this);
        this.physics.add.overlap(this.ship, this.collectibleStars, this.collectStar, null, this);

        this.cursors = this.input.keyboard.createCursorKeys();
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        this.createHUD();

        this.time.delayedCall(1000, () => this.startNextWave());
    }

    createStarfield() {
        for (let i = 0; i < 150; i++) {
            const star = this.add.circle(
                Phaser.Math.Between(0, 1920),
                Phaser.Math.Between(0, 1080),
                Phaser.Math.FloatBetween(0.5, 2),
                0xffffff,
                Phaser.Math.FloatBetween(0.2, 0.9)
            ).setDepth(1);
            star.speed = Phaser.Math.Between(20, 70);
            this.bgStars.push(star);
        }
    }

    createHUD() {
        this.scoreText = this.add.text(50, 25, 'SCORE: 0', {
            fontSize: '26px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setDepth(100);

        this.waveText = this.add.text(960, 25, 'WAVE 1 / 3', {
            fontSize: '26px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5, 0).setDepth(100);

        this.add.text(1530, 22, 'HEALTH', {
            fontSize: '18px',
            fontFamily: 'Arial',
            color: '#aaaaaa'
        }).setDepth(100);

        this.add.rectangle(1700, 35, 204, 22, 0x333333).setDepth(99);
        this.healthBar = this.add.rectangle(1600, 35, 200, 18, 0x00ff00).setOrigin(0, 0.5).setDepth(100);

        this.starDisplay = this.add.text(50, 60, '☆ ☆ ☆', {
            fontSize: '30px',
            color: '#ffdd00'
        }).setDepth(100);

        this.debrisText = this.add.text(50, 100, 'CLEARED: 0', {
            fontSize: '18px',
            fontFamily: 'Arial',
            color: '#88aacc'
        }).setDepth(100);
    }

    updateHUD() {
        this.scoreText.setText(`SCORE: ${this.score}`);
        this.waveText.setText(`WAVE ${this.currentWave} / ${this.maxWaves}`);
        this.debrisText.setText(`CLEARED: ${this.debrisDestroyed}`);

        const healthPct = Math.max(0, this.health / 100);
        this.healthBar.displayWidth = 200 * healthPct;

        if (healthPct > 0.6) {
            this.healthBar.setFillStyle(0x00ff00);
        } else if (healthPct > 0.3) {
            this.healthBar.setFillStyle(0xffaa00);
        } else {
            this.healthBar.setFillStyle(0xff0000);
        }

        let starStr = '';
        for (let i = 0; i < 3; i++) {
            starStr += i < this.starsCollected ? '★ ' : '☆ ';
        }
        this.starDisplay.setText(starStr);
    }

    startNextWave() {
        this.currentWave++;
        if (this.currentWave > this.maxWaves) {
            this.completeLevel();
            return;
        }

        this.updateHUD();

        const announceText = this.add.text(960, 420, `WAVE ${this.currentWave}`, {
            fontSize: '80px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold',
            stroke: '#3366aa',
            strokeThickness: 5
        }).setOrigin(0.5).setDepth(200);

        const subText = this.add.text(960, 510, this.getWaveSubtitle(), {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#88aaff'
        }).setOrigin(0.5).setDepth(200);

        this.tweens.add({
            targets: [announceText, subText],
            alpha: 0,
            duration: 2000,
            delay: 500,
            onComplete: () => {
                announceText.destroy();
                subText.destroy();
                this.startWaveSpawning();
            }
        });
    }

    getWaveSubtitle() {
        switch (this.currentWave) {
            case 1: return 'Small debris detected — clear the field!';
            case 2: return 'Larger fragments incoming — stay sharp!';
            case 3: return 'Critical debris density — give it everything!';
            default: return '';
        }
    }

    startWaveSpawning() {
        const config = this.waveConfigs[this.currentWave - 1];
        this.waveActive = true;

        this.spawnTimer = this.time.addEvent({
            delay: config.spawnRate,
            callback: () => this.spawnDebris(config.types),
            loop: true
        });

        const starDelay = Phaser.Math.Between(4000, Math.min(config.duration - 5000, 15000));
        this.time.delayedCall(starDelay, () => {
            if (this.waveActive && !this.gameOver && this.starsCollected < 3) {
                this.spawnCollectibleStar();
            }
        });

        this.time.delayedCall(config.duration, () => {
            if (!this.gameOver) {
                this.endWaveSpawning();
            }
        });
    }

    endWaveSpawning() {
        this.waveActive = false;
        if (this.spawnTimer) {
            this.spawnTimer.destroy();
            this.spawnTimer = null;
        }

        this.time.delayedCall(3000, () => {
            if (!this.gameOver) {
                this.showEducationalFact();
            }
        });
    }

    showEducationalFact() {
        this.isPaused = true;

        this.ship.setVelocity(0, 0);
        this.thruster.setVisible(false);

        const overlay = this.add.rectangle(960, 540, 1920, 1080, 0x000000, 0.75).setDepth(150);

        const factTitle = this.add.text(960, 360, 'DID YOU KNOW?', {
            fontSize: '40px',
            fontFamily: 'Arial',
            color: '#ffdd00',
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(200);

        const factText = this.add.text(960, 480, this.educationalFacts[this.currentWave - 1], {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#ffffff',
            align: 'center',
            lineSpacing: 10
        }).setOrigin(0.5).setDepth(200);

        const continueText = this.add.text(960, 620, '[ Press SPACE to continue ]', {
            fontSize: '22px',
            fontFamily: 'Arial',
            color: '#88aaff'
        }).setOrigin(0.5).setDepth(200);

        this.tweens.add({
            targets: continueText,
            alpha: 0.3,
            duration: 600,
            yoyo: true,
            repeat: -1
        });

        this.input.keyboard.once('keydown-SPACE', () => {
            overlay.destroy();
            factTitle.destroy();
            factText.destroy();
            continueText.destroy();
            this.isPaused = false;
            this.thruster.setVisible(true);
            this.startNextWave();
        });
    }

    spawnDebris(types) {
        if (this.gameOver || this.levelComplete) return;

        const type = Phaser.Utils.Array.GetRandom(types);
        const x = Phaser.Math.Between(60, 1860);

        let textureKey, points, speedY, speedX;

        switch (type) {
            case 'small':
                textureKey = 'l4_debris_small';
                points = 10;
                speedY = Phaser.Math.Between(100, 150);
                break;
            case 'medium':
                textureKey = 'l4_debris_medium';
                points = 25;
                speedY = Phaser.Math.Between(75, 175);
                break;
            case 'large':
                textureKey = 'l4_debris_large';
                points = 50;
                speedY = Phaser.Math.Between(50, 150);
                break;
        }

        speedX = Phaser.Math.Between(-30, 30);

        const d = this.debris.create(x, -50, textureKey);
        d.setVelocity(speedX, speedY);
        d.setData('points', points);
        d.setAngularVelocity(Phaser.Math.Between(-80, 80));
        d.setDepth(5);
    }

    spawnCollectibleStar() {
        const x = Phaser.Math.Between(200, 1720);
        const star = this.collectibleStars.create(x, -40, 'l4_star');
        star.setVelocity(Phaser.Math.Between(-40, 40), Phaser.Math.Between(60, 120));
        star.setDepth(8);

        this.tweens.add({
            targets: star,
            scaleX: 1.3,
            scaleY: 1.3,
            duration: 400,
            yoyo: true,
            repeat: -1
        });
    }

    shootBullet() {
        const bullet = this.bullets.create(this.ship.x, this.ship.y - 35, 'l4_bullet');
        if (bullet) {
            bullet.setVelocityY(-800);
            bullet.setDepth(8);
        }
    }

    hitDebris(bullet, debrisItem) {
        const points = debrisItem.getData('points');
        this.score += points;
        this.debrisDestroyed++;

        const explosion = this.add.circle(debrisItem.x, debrisItem.y, 12, 0xff6600, 0.9).setDepth(50);
        this.tweens.add({
            targets: explosion,
            alpha: 0,
            scaleX: 3,
            scaleY: 3,
            duration: 250,
            onComplete: () => explosion.destroy()
        });

        for (let i = 0; i < 4; i++) {
            const spark = this.add.circle(
                debrisItem.x + Phaser.Math.Between(-15, 15),
                debrisItem.y + Phaser.Math.Between(-15, 15),
                3, 0xffaa33, 0.8
            ).setDepth(50);
            this.tweens.add({
                targets: spark,
                x: spark.x + Phaser.Math.Between(-40, 40),
                y: spark.y + Phaser.Math.Between(-40, 40),
                alpha: 0,
                duration: 300,
                onComplete: () => spark.destroy()
            });
        }

        const popup = this.add.text(debrisItem.x, debrisItem.y, `+${points}`, {
            fontSize: '20px',
            fontFamily: 'Arial',
            color: '#ffff00',
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(50);
        this.tweens.add({
            targets: popup,
            y: popup.y - 40,
            alpha: 0,
            duration: 500,
            onComplete: () => popup.destroy()
        });

        bullet.destroy();
        debrisItem.destroy();
        this.updateHUD();
    }

    shipHitDebris(ship, debrisItem) {
        this.health -= 15;
        debrisItem.destroy();

        ship.setTint(0xff0000);
        this.time.delayedCall(200, () => {
            if (ship.active) ship.clearTint();
        });

        this.cameras.main.shake(200, 0.008);

        const flash = this.add.rectangle(960, 540, 1920, 1080, 0xff0000, 0.15).setDepth(90);
        this.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 300,
            onComplete: () => flash.destroy()
        });

        this.updateHUD();

        if (this.health <= 0) {
            this.health = 0;
            this.updateHUD();
            this.handleGameOver();
        }
    }

    collectStar(ship, star) {
        this.starsCollected++;
        star.destroy();

        for (let i = 0; i < 10; i++) {
            const angle = (Math.PI * 2 / 10) * i;
            const sparkle = this.add.circle(
                ship.x + Math.cos(angle) * 15,
                ship.y + Math.sin(angle) * 15,
                4, 0xffdd00
            ).setDepth(50);
            this.tweens.add({
                targets: sparkle,
                x: ship.x + Math.cos(angle) * 70,
                y: ship.y + Math.sin(angle) * 70,
                alpha: 0,
                scaleX: 0.2,
                scaleY: 0.2,
                duration: 600,
                onComplete: () => sparkle.destroy()
            });
        }

        const text = this.add.text(960, 200, '★ STAR COLLECTED! ★', {
            fontSize: '44px',
            fontFamily: 'Arial',
            color: '#ffdd00',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(200);
        this.tweens.add({
            targets: text,
            alpha: 0,
            y: 160,
            duration: 1500,
            onComplete: () => text.destroy()
        });

        this.updateHUD();
    }

    handleGameOver() {
        this.gameOver = true;
        this.waveActive = false;
        if (this.spawnTimer) {
            this.spawnTimer.destroy();
            this.spawnTimer = null;
        }

        this.ship.setVisible(false);
        this.thruster.setVisible(false);

        const bigExplosion = this.add.circle(this.ship.x, this.ship.y, 25, 0xff3300).setDepth(50);
        this.tweens.add({
            targets: bigExplosion,
            scaleX: 5,
            scaleY: 5,
            alpha: 0,
            duration: 800,
            onComplete: () => bigExplosion.destroy()
        });

        this.time.delayedCall(1000, () => {
            const overlay = this.add.rectangle(960, 540, 1920, 1080, 0x000000, 0.85).setDepth(300);

            this.add.text(960, 350, 'MISSION FAILED', {
                fontSize: '80px',
                fontFamily: 'Arial',
                color: '#ff3333',
                fontStyle: 'bold',
                stroke: '#000',
                strokeThickness: 5
            }).setOrigin(0.5).setDepth(301);

            this.add.text(960, 460, 'The debris was too much for Alvin\'s ship...', {
                fontSize: '24px',
                fontFamily: 'Arial',
                color: '#cccccc'
            }).setOrigin(0.5).setDepth(301);

            this.add.text(960, 530, `Score: ${this.score}   |   Debris Cleared: ${this.debrisDestroyed}   |   Stars: ${this.starsCollected}/3`, {
                fontSize: '26px',
                fontFamily: 'Arial',
                color: '#ffffff'
            }).setOrigin(0.5).setDepth(301);

            const retryText = this.add.text(960, 650, '[ Press SPACE to retry ]', {
                fontSize: '32px',
                fontFamily: 'Arial',
                color: '#ffdd00',
                fontStyle: 'bold'
            }).setOrigin(0.5).setDepth(301);

            this.tweens.add({
                targets: retryText,
                alpha: 0.3,
                duration: 700,
                yoyo: true,
                repeat: -1
            });

            this.add.text(960, 720, '[ Press ESC to quit ]', {
                fontSize: '22px',
                fontFamily: 'Arial',
                color: '#888888'
            }).setOrigin(0.5).setDepth(301);

            this.input.keyboard.once('keydown-SPACE', () => {
                this.scene.restart();
            });

            this.input.keyboard.once('keydown-ESC', () => {
                this.scene.start('Level04EntryScene');
            });
        });
    }

    completeLevel() {
        this.levelComplete = true;
        if (this.spawnTimer) {
            this.spawnTimer.destroy();
            this.spawnTimer = null;
        }

        const victoryText = this.add.text(960, 400, 'ORBIT CLEARED!', {
            fontSize: '72px',
            fontFamily: 'Arial',
            color: '#00ff88',
            fontStyle: 'bold',
            stroke: '#003322',
            strokeThickness: 5
        }).setOrigin(0.5).setDepth(200);

        this.tweens.add({
            targets: victoryText,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 500,
            yoyo: true,
            repeat: 2,
            onComplete: () => {
                victoryText.destroy();
                this.showCompletionScreen();
            }
        });
    }

    showCompletionScreen() {
        this.ship.setVisible(false);
        this.thruster.setVisible(false);
        this.bullets.clear(true, true);
        this.debris.clear(true, true);
        this.collectibleStars.clear(true, true);

        const D = 400;

        this.add.rectangle(960, 540, 1920, 1080, 0x060625).setDepth(D);

        for (let i = 0; i < 120; i++) {
            this.add.circle(
                Phaser.Math.Between(0, 1920),
                Phaser.Math.Between(0, 1080),
                Phaser.Math.FloatBetween(0.5, 2),
                0xffffff,
                Phaser.Math.FloatBetween(0.2, 0.7)
            ).setDepth(D);
        }

        const earthGlow = this.add.circle(960, 1050, 180, 0x22aa66, 0.25).setDepth(D);
        this.tweens.add({
            targets: earthGlow,
            alpha: 0.15,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 2000,
            yoyo: true,
            repeat: -1
        });

        this.add.text(960, 80, 'MISSION COMPLETE!', {
            fontSize: '68px',
            fontFamily: 'Arial',
            color: '#00ff88',
            fontStyle: 'bold',
            stroke: '#003322',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(D + 1);

        this.add.text(960, 150, 'Space Junk — Ozone Layer Restored', {
            fontSize: '26px',
            fontFamily: 'Arial',
            color: '#66ccaa',
            fontStyle: 'italic'
        }).setOrigin(0.5).setDepth(D + 1);

        this.add.rectangle(960, 290, 500, 160, 0x112244, 0.6).setStrokeStyle(2, 0x3366aa).setDepth(D + 1);

        this.add.text(960, 240, `SCORE: ${this.score}`, {
            fontSize: '36px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(D + 1);

        this.add.text(960, 290, `Debris Cleared: ${this.debrisDestroyed}`, {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#aabbdd'
        }).setOrigin(0.5).setDepth(D + 1);

        let starStr = '';
        for (let i = 0; i < 3; i++) {
            starStr += i < this.starsCollected ? '★  ' : '☆  ';
        }
        this.add.text(960, 370, starStr, {
            fontSize: '64px',
            color: '#ffdd00'
        }).setOrigin(0.5).setDepth(D + 1);

        this.add.text(960, 430, `${this.starsCollected} / 3 Stars Collected`, {
            fontSize: '22px',
            fontFamily: 'Arial',
            color: '#ffdd00'
        }).setOrigin(0.5).setDepth(D + 1);

        this.add.rectangle(960, 620, 900, 250, 0x112233, 0.5).setStrokeStyle(1, 0x334466).setDepth(D + 1);

        this.add.text(960, 520, 'How You Can Help Protect the Ozone Layer:', {
            fontSize: '26px',
            fontFamily: 'Arial',
            color: '#66bbff',
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(D + 1);

        const tips = [
            'Support policies for responsible satellite disposal and debris removal',
            'Reduce use of ozone-depleting substances like CFCs and halons',
            'Advocate for cleaner rocket fuel alternatives',
            'Spread awareness about the link between space pollution and climate'
        ];

        tips.forEach((tip, i) => {
            this.add.text(530, 565 + i * 38, `•  ${tip}`, {
                fontSize: '19px',
                fontFamily: 'Arial',
                color: '#ccddee'
            }).setDepth(D + 1);
        });

        this.saveGameProgress();

        const continueText = this.add.text(960, 820, '[ Press SPACE to continue ]', {
            fontSize: '30px',
            fontFamily: 'Arial',
            color: '#ffdd00',
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(D + 1);

        this.tweens.add({
            targets: continueText,
            alpha: 0.3,
            duration: 700,
            yoyo: true,
            repeat: -1
        });

        this.add.text(960, 880, '[ Press R to replay level ]', {
            fontSize: '20px',
            fontFamily: 'Arial',
            color: '#888899'
        }).setOrigin(0.5).setDepth(D + 1);

        this.input.keyboard.once('keydown-SPACE', () => {
            GameFlowManager.onLevelComplete(this, 'level04');
        });

        this.input.keyboard.once('keydown-R', () => {
            this.scene.restart();
        });
    }

    async saveGameProgress() {
        if (GameState.userId) {
            try {
                await saveProgress(GameState.userId, 'level04', this.starsCollected);
                console.log('Progress saved: level04, stars:', this.starsCollected);
            } catch (e) {
                console.error('Failed to save progress:', e);
            }
        }
    }

    update(time, delta) {
        if (this.gameOver || this.levelComplete || this.isPaused) return;

        const dt = delta / 1000;

        this.bgStars.forEach(star => {
            star.y += star.speed * dt;
            if (star.y > 1090) {
                star.y = -5;
                star.x = Phaser.Math.Between(0, 1920);
            }
        });

        if (this.cursors.left.isDown) {
            this.ship.setVelocityX(-this.shipSpeed);
        } else if (this.cursors.right.isDown) {
            this.ship.setVelocityX(this.shipSpeed);
        } else {
            this.ship.setVelocityX(0);
        }

        if (this.cursors.up.isDown) {
            this.ship.setVelocityY(-this.shipSpeed);
        } else if (this.cursors.down.isDown) {
            this.ship.setVelocityY(this.shipSpeed);
        } else {
            this.ship.setVelocityY(0);
        }

        this.thruster.setPosition(this.ship.x, this.ship.y + 33);

        if (this.spaceKey.isDown && time > this.lastFired + this.fireRate) {
            this.shootBullet();
            this.lastFired = time;
        }

        this.bullets.getChildren().slice().forEach(bullet => {
            if (bullet.active && bullet.y < -20) {
                bullet.destroy();
            }
        });

        this.debris.getChildren().slice().forEach(d => {
            if (d.x < 0 || d.x > 1920) {
                d.destroy();
                return;
            }

            if (d.active && d.y > 1100) {
                this.health -= 5;
                d.destroy();
                this.updateHUD();
                if (this.health <= 0) {
                    this.health = 0;
                    this.updateHUD();
                    this.handleGameOver();
                }
            }
        });

        this.collectibleStars.getChildren().slice().forEach(s => {
            if (s.active && (s.y > 1100 || s.x < -50 || s.x > 1970)) {
                s.destroy();
            }
        });

        if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
            if (!this.isPausedMenuOpen && !this.levelComplete && !this.gameOver) {
                this.openPauseMenu();
                return;
            }
        }

        if (this.isPausedMenuOpen) {

            if (Phaser.Input.Keyboard.JustDown(this.confirmKey)) {
                this.physics.resume();
                this.isPausedMenuOpen = false;
                this.scene.start('Level04EntryScene');
                return;
            }

            if (Phaser.Input.Keyboard.JustDown(this.cancelKey)) {
                this.closePauseMenu();
                return;
            }

            return;
        }
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
            150,
            0x111111,
            0.6
        ).setDepth(31).setRounded(20);

        // Text
        this.pauseText = this.add.text(
            this.scale.width / 2,
            this.scale.height / 2 - 30,
            "Exit Level?\n",
            {
                fontSize: '32px',
                color: '#ffffff'
            }
        ).setOrigin(0.5).setDepth(32);

        this.pauseSubText = this.add.text(
            this.scale.width / 2,
            this.scale.height / 2 + 20,
            "Press Y to confirm\n\nPress N to cancel",
            {
                fontSize: '20px',
                color: '#cccccc',
                align: 'center'
            }
        ).setOrigin(0.5).setDepth(32);
    }


    closePauseMenu() {
        this.isPausedMenuOpen = false;
        this.pauseDim.destroy();
        this.pauseBox.destroy();
        this.pauseText.destroy();
        this.pauseSubText.destroy();
        this.physics.resume();
    }
}
