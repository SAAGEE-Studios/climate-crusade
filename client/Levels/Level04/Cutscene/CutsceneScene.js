export class Level04_CutsceneScene extends Phaser.Scene {
    constructor() {
        super('Level04_CutsceneScene');
    }

    create() {
        // Background
        this.add.rectangle(960, 540, 1920, 1080, 0x030318);

        // Starfield
        for (let i = 0; i < 100; i++) {
            this.add.circle(
                Phaser.Math.Between(0, 1920),
                Phaser.Math.Between(0, 1080),
                Phaser.Math.FloatBetween(0.5, 1.5),
                0xffffff,
                Phaser.Math.FloatBetween(0.2, 0.7)
            );
        }

        // Earth glow at bottom
        const earthGlow = this.add.circle(960, 1200, 300, 0x2244aa, 0.3);
        this.tweens.add({
            targets: earthGlow,
            alpha: 0.15,
            duration: 2000,
            yoyo: true,
            repeat: -1
        });

        const storyLines = [
            "Earth's orbit has become a junkyard...",
            "Thousands of broken satellites, rocket fragments,\nand debris circle the planet at deadly speeds.",
            "These pollutants are tearing holes in the ozone layer —\nEarth's shield against harmful ultraviolet radiation.",
            "Without the ozone layer, life on Earth faces\nskin cancer, crop damage, and ecosystem collapse.",
            "Alvin must pilot his ship into orbit\nand clear the debris before it's too late!"
        ];

        let currentLine = 0;
        const lineY = 400;

        const storyText = this.add.text(960, lineY, '', {
            fontSize: '30px',
            fontFamily: 'Arial',
            color: '#ccddff',
            align: 'center',
            lineSpacing: 10
        }).setOrigin(0.5).setAlpha(0);

        const skipText = this.add.text(960, 950, 'Press SPACE to skip', {
            fontSize: '18px',
            fontFamily: 'Arial',
            color: '#666688'
        }).setOrigin(0.5);

        const showNextLine = () => {
            if (currentLine >= storyLines.length) {
                this.scene.start('Level04_GameplayScene');
                return;
            }

            storyText.setText(storyLines[currentLine]);
            currentLine++;

            this.tweens.add({
                targets: storyText,
                alpha: 1,
                duration: 800,
                hold: 2500,
                yoyo: true,
                onComplete: () => {
                    showNextLine();
                }
            });
        };

        // Start story after a brief pause
        this.time.delayedCall(500, showNextLine);

        // Skip cutscene
        this.input.keyboard.once('keydown-SPACE', () => {
            this.scene.start('Level04_GameplayScene');
        });
    }
}
