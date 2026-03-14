import { GameFlowManager } from '../../Core/GameFlowManager.js';
import { GameState } from '../../Core/GameState.js';

export class Level02EntryScene extends Phaser.Scene {

    constructor() {
        super('Level02EntryScene');
    }

    preload() {
        // Load the static background image
        this.load.image('Level2Background', './client/Levels/Level02/Assets/Backgrounds/Background_Level_2.png');
        
        // Load the single cutscene video 
        this.load.video(
            'Level2Cutscene',
            './client/Levels/Level02/Cutscenes/ocean_salvage_intro.mp4', 
            'loadeddata',
            false,
            true
        );
    }

    create() {
        this.cutsceneStarted = false;
        this.cameras.main.fadeIn(200);
        this.events.on('shutdown', this.shutdown, this);
        this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

        // Display static background
        this.bgImage = this.add.image(
            this.scale.width / 2,
            this.scale.height / 2,
            'Level2Background'
        ).setOrigin(0.5);

        // Scale background to fit screen
        this.bgImage.setDisplaySize(this.scale.width, this.scale.height);

        // Start prompt
        this.startText = this.add.text(
            this.scale.width / 2,
            this.scale.height - 100, // Positioned near the bottom
            "Press Space to Start",
            {
                fontSize: '28px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 4
            }
        )
            .setOrigin(0.5)
            .setDepth(5);

        this.tweens.add({
            targets: this.startText,
            alpha: { from: 1, to: 0.6 },
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        this.spaceKey = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.SPACE
        );

        // Mobile tap support
        this.input.once('pointerdown', () => {
            this.playCutscene();
        });
    }

    update() {
        if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
            this.playCutscene();
        }

        if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
            if (this.cutsceneStarted) return;
            this.scene.stop();
            GameFlowManager.goToLevelSelect(this);
        }
    }

    playCutscene() {
        if (this.cutsceneStarted) return;
        this.cutsceneStarted = true;

        if (this.startText) this.startText.setVisible(false);
        if (this.bgImage) this.bgImage.setVisible(false); // Hide background while cutscene plays

        this.cutsceneVideo = this.add.video(
            this.scale.width / 2,
            this.scale.height / 2,
            'Level2Cutscene'
        ).setOrigin(0.5);

        // Scale video to fit screen
        this.cutsceneVideo.setDisplaySize(
            this.scale.width,
            this.scale.height
        );

        // Add a safety check in case the video cannot play or the path is wrong
        this.cutsceneVideo.on('error', () => {
            console.warn('Cutscene video failed to load or play. Skipping directly to level.');
            this.skipToLevel();
        });

        this.cutsceneVideo.setMute(false);
        this.cutsceneVideo.play();

        this.skipUI = document.getElementById('skip-handler-1'); 
        if (this.skipUI) {
            this.skipUI.style.display = 'flex';
            this.skipUI.style.top = '88%';
        }

        const skipButton = document.getElementById('skip-button');
        if (skipButton) {
            skipButton.onclick = () => {
                this.skipToLevel();
            };
        }

        this.cutsceneVideo.once('complete', () => {
            this.skipToLevel();
        });
    }

    // Helper function to cleanly handle transitions
    skipToLevel() {
        if (this.skipUI) this.skipUI.style.display = 'none';

        if (this.cutsceneVideo) {
            this.cutsceneVideo.stop();
            this.cutsceneVideo.destroy();
            this.cutsceneVideo = null;
        }

        // Immediately transition to gameplay
        this.scene.start('DeepPurgeLevel', {}); 
    }

    shutdown() {
        if (this.cutsceneVideo) {
            this.cutsceneVideo.stop();
            this.cutsceneVideo.destroy();
            this.cutsceneVideo = null;
        }

        if (this.skipUI) {
            this.skipUI.style.display = 'none';
        }

        this.input.removeAllListeners();
    }
}