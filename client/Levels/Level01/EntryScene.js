import { GameFlowManager } from '../../Core/GameFlowManager.js';
import { GameState } from '../../Core/GameState.js';

/**
 * Level01EntryScene
 * ------------------
 * Entry gateway for Level 01 (Acid Downpour).
 *
 * This scene displays the animated title card, plays the
 * introductory cutscene, and presents gameplay instructions
 * before transitioning into the playable level.
 *
 * It supports keyboard and mobile input, skip functionality,
 * and proper cleanup of video resources on shutdown.
 */

export class Level01EntryScene extends Phaser.Scene {

    constructor() {
        super('Level01EntryScene');
    }

    preload() {
        this.load.video(
            'BackgroundCard',
            './client/Levels/Level01/Cutscenes/Acid_Downpour_Title_Card.mp4',
            'loadeddata',
            false,
            true
        );
        this.load.video(
            'Level1Cutscene',
            './client/Levels/Level01/Cutscenes/Level_1_Cutscene_25MB.mp4',
            'loadeddata',
            false,
            true
        );
        this.load.image('leafPatch', './client/Levels/Level01/Cutscenes/LeafPatch.png');
        this.load.image('instructionsPanel', './client/Levels/Level01/Cutscenes/Acid_Downpour_Instructions.png');
    }

    create() {
        this.cutsceneStarted = false;
        this.instructionsShown = false;
        this.cameras.main.fadeIn(200);
        this.events.on('shutdown', this.shutdown, this);
        this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

        this.titleVideo = this.add.video(
            this.scale.width / 2,
            this.scale.height / 2,
            'BackgroundCard'
        ).setOrigin(0.5);

        this.titleVideo.setDisplaySize(this.scale.width / 5, this.scale.height / 2.82);
        this.titleVideo.setLoop(true);
        this.titleVideo.setMute(true);
        this.titleVideo.play(true);

        const videoWidth = this.scale.width / 22;
        const videoHeight = this.scale.height / 2.82;

        // Top Y position of the video
        const topOfVideo = this.titleVideo.y - videoHeight / 1 - 100;

        this.leafPatch = this.add.image(
            this.titleVideo.x + 85,
            topOfVideo,
            'leafPatch'
        )
            .setOrigin(0, 0)
            .setDisplaySize(videoWidth + 50, 35)
            .setDepth(1)
            .setAlpha(0.7);

        this.leafPatch2 = this.add.image(
            this.titleVideo.x + 190,
            topOfVideo,
            'leafPatch'
        )
            .setOrigin(0, 0)
            .setDisplaySize(videoWidth, 35)
            .setDepth(1)
            .setAlpha(0.7);

        // Start prompt
        this.startText = this.add.text(
            this.scale.width / 2,
            this.titleVideo.y + (this.scale.height / 2.82) / 1.4 - 10,
            "Press Space to Start",
            {
                fontSize: '28px',
                color: '#3f3f32'
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

    /**
     * Cleans up active videos, DOM skip UI, and input listeners
     * to prevent resource leaks when leaving the scene.
     */
    
    beginInstructions() {

        if (this.instructionsShown) return;
        this.instructionsShown = true;

        // Stop video
        this.children.list.forEach(obj => {
            if (obj.type === 'Video') {
                obj.stop();
            }
        });

        // Hide start text
        this.startText.setVisible(false);

        this.displayInstructions();
    }

    /**
     * Stops the looping title card and plays the main level cutscene.
     * Provides skip functionality and transitions to instructions
     * upon completion or manual skip.
     */

    playCutscene() {

        if (this.cutsceneStarted) return;
        this.cutsceneStarted = true;

        // Stop title video
        if (this.titleVideo) {
            this.titleVideo.stop();
            this.titleVideo.destroy();
            this.titleVideo = null;
        }
        this.startText.setVisible(false);

        // Destroy leaf patches if you want
        // (optional but cleaner)
        if (this.leafPatch) this.leafPatch.destroy();
        if (this.leafPatch2) this.leafPatch2.destroy();

        this.cutsceneVideo = this.add.video(
            this.scale.width / 2,
            this.scale.height / 2,
            'Level1Cutscene'
        ).setOrigin(0.5);

        this.cutsceneVideo.setDisplaySize(
            this.scale.width / 7.5,
            this.scale.height / 4
        );

        this.cutsceneVideo.setMute(false);
        this.cutsceneVideo.play();

        this.skipUI = document.getElementById('skip-handler-1');
        this.skipUI.style.display = 'flex';
        this.skipUI.style.top = '88%';

        const skipButton = document.getElementById('skip-button');

        skipButton.onclick = () => {

            // Hide skip UI immediately
            this.skipUI.style.display = 'none';

            if (this.cutsceneVideo) {
                this.cutsceneVideo.stop();
                this.cutsceneVideo.destroy();
                this.cutsceneVideo = null;
            }

            this.displayInstructions();
        };

        this.cutsceneVideo.once('complete', () => {
            this.skipUI.style.display = 'none';

            if (this.cutsceneVideo) {
                this.cutsceneVideo.destroy();
                this.cutsceneVideo = null;
            }

            this.displayInstructions();
        });
    }

    /**
     * Displays the level instruction overlay and waits for user input
     * before starting the gameplay scene.
     */

    displayInstructions() {

        // Dim background
        const dim = this.add.rectangle(
            this.scale.width / 2,
            this.scale.height / 2,
            this.scale.width,
            this.scale.height,
            0x000000,
            0.6
        ).setDepth(10);

        // Instruction panel image
        const panel = this.add.image(
            0,
            0,
            'instructionsPanel'
        ).setDepth(11)
            .setOrigin(0, 0);

        panel.setDisplaySize(this.scale.width, this.scale.height);

        // Continue text
        const continueText = this.add.text(
            this.scale.width / 2,
            this.scale.height / 2 - 30,
            "Tap or Press Space to Continue",
            {
                fontSize: '22px',
                color: '#3f3f32'
            }
        )
            .setOrigin(0.5)
            .setDepth(12);

        this.tweens.add({
            targets: continueText,
            alpha: { from: 1, to: 0.3 },
            duration: 800,
            yoyo: true,
            repeat: -1
        });

        this.input.once('pointerdown', () => {
            this.scene.start('AcidDownpourLevel',{});
        });

        this.input.keyboard.once('keydown-SPACE', () => {
            this.scene.start('AcidDownpourLevel',{});
        });
    }

    /**
     * Cleans up active videos, DOM skip UI, and input listeners
     * to prevent resource leaks when leaving the scene.
     */

    shutdown() {
        if (this.titleVideo) {
            this.titleVideo.stop();
            this.titleVideo.destroy();
            this.titleVideo = null;
        }

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