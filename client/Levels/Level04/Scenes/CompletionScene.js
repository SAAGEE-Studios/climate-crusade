import { GameFlowManager } from '../../../Core/GameFlowManager.js';
import { GameState } from '../../../Core/GameState.js';
import { saveProgress } from '../../../Core/api.js';

export class Level04_CompletionScene extends Phaser.Scene {
    constructor() {
        super('Level04_CompletionScene');
    }

    init(data) {
        this.finalScore = data.score || 0;
        this.starsCollected = data.starsCollected || 0;
        this.debrisDestroyed = data.debrisDestroyed || 0;
    }

    create() {
        // Background
        this.add.rectangle(960, 540, 1920, 1080, 0x060625);

        // Starfield
        for (let i = 0; i < 120; i++) {
            this.add.circle(
                Phaser.Math.Between(0, 1920),
                Phaser.Math.Between(0, 1080),
                Phaser.Math.FloatBetween(0.5, 2),
                0xffffff,
                Phaser.Math.FloatBetween(0.2, 0.7)
            );
        }

        // Restored Earth glow
        const earthGlow = this.add.circle(960, 1050, 180, 0x22aa66, 0.25);
        this.tweens.add({
            targets: earthGlow,
            alpha: 0.15,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 2000,
            yoyo: true,
            repeat: -1
        });

        // Title
        this.add.text(960, 80, 'MISSION COMPLETE!', {
            fontSize: '68px',
            fontFamily: 'Arial',
            color: '#00ff88',
            fontStyle: 'bold',
            stroke: '#003322',
            strokeThickness: 4
        }).setOrigin(0.5);

        this.add.text(960, 150, 'Space Junk — Ozone Layer Restored', {
            fontSize: '26px',
            fontFamily: 'Arial',
            color: '#66ccaa',
            fontStyle: 'italic'
        }).setOrigin(0.5);

        // Stats box
        this.add.rectangle(960, 290, 500, 160, 0x112244, 0.6).setStrokeStyle(2, 0x3366aa);

        this.add.text(960, 240, `SCORE: ${this.finalScore}`, {
            fontSize: '36px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(960, 290, `Debris Cleared: ${this.debrisDestroyed}`, {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#aabbdd'
        }).setOrigin(0.5);

        // Stars display
        let starStr = '';
        for (let i = 0; i < 3; i++) {
            starStr += i < this.starsCollected ? '★  ' : '☆  ';
        }
        this.add.text(960, 370, starStr, {
            fontSize: '64px',
            color: '#ffdd00'
        }).setOrigin(0.5);

        this.add.text(960, 430, `${this.starsCollected} / 3 Stars Collected`, {
            fontSize: '22px',
            fontFamily: 'Arial',
            color: '#ffdd00'
        }).setOrigin(0.5);

        // Educational section
        this.add.rectangle(960, 620, 900, 250, 0x112233, 0.5).setStrokeStyle(1, 0x334466);

        this.add.text(960, 520, 'How You Can Help Protect the Ozone Layer:', {
            fontSize: '26px',
            fontFamily: 'Arial',
            color: '#66bbff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

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
            });
        });

        // Save progress to database
        this.saveGameProgress();

        // Continue button
        const continueText = this.add.text(960, 820, '[ Press SPACE to continue ]', {
            fontSize: '30px',
            fontFamily: 'Arial',
            color: '#ffdd00',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.tweens.add({
            targets: continueText,
            alpha: 0.3,
            duration: 700,
            yoyo: true,
            repeat: -1
        });

        // Replay option
        this.add.text(960, 880, '[ Press R to replay level ]', {
            fontSize: '20px',
            fontFamily: 'Arial',
            color: '#888899'
        }).setOrigin(0.5);

        this.input.keyboard.once('keydown-SPACE', () => {
            GameFlowManager.onLevelComplete(this, 'level04');
        });

        this.input.keyboard.once('keydown-R', () => {
            this.scene.start('Level04_EntryScene');
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
}
