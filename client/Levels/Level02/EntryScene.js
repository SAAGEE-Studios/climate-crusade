import { GameFlowManager } from '../../Core/GameFlowManager.js';
import { GameState } from '../../Core/GameState.js';

export class Level02EntryScene extends Phaser.Scene {

    constructor() {
        super('Level02EntryScene');
    }

    preload() {
        // Load the static background image
        this.load.image('Level2Background', './client/Levels/Level02/Assets/Backgrounds/Background_Level_2.png');
        
        // FIX 1: Use the modern 2-argument load.video() signature.
        // The old 5-argument form (loadeddata, noAudio, crossOrigin) was deprecated
        // in Phaser 3.60+ and causes the video to silently fail to register.
        this.load.video(
            'Level2Cutscene',
            './client/Levels/Level02/Cutscenes/ocean_salvage_intro.mp4'
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

        this.bgImage.setDisplaySize(this.scale.width, this.scale.height);

        this.startText = this.add.text(
            this.scale.width / 2,
            this.scale.height - 100,
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

        // FIX 2: Use 'on' instead of 'once', and guard with cutsceneStarted flag.
        this.input.on('pointerdown', () => {
            if (!this.cutsceneStarted) {
                this.playCutscene();
            }
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
        if (this.bgImage) this.bgImage.setVisible(false);

        this.cutsceneVideo = this.add.video(
            this.scale.width / 2,
            this.scale.height / 2,
            'Level2Cutscene'
        ).setOrigin(0.5);

        // FIX 3: Read dimensions from the underlying HTML <video> element via the
        // 'playing' event, not a blind timer. video.width/height on the Phaser Game
        // Object are only populated after the texture is created (async), so they
        // were undefined when the timer fired. video.video.videoWidth/videoHeight
        // are available as soon as the browser starts playback.
        this.cutsceneVideo.on('playing', () => {
            if (!this.cutsceneVideo) return;
            const el = this.cutsceneVideo.video;
            const vidW = (el && el.videoWidth)  || 1280;
            const vidH = (el && el.videoHeight) || 720;
            const scale = Math.min(this.scale.width / vidW, this.scale.height / vidH);
            this.cutsceneVideo.setDisplaySize(vidW * scale, vidH * scale);
        });

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

    skipToLevel() {
        if (this.skipUI) this.skipUI.style.display = 'none';

        if (this.cutsceneVideo) {
            this.cutsceneVideo.stop();
            this.cutsceneVideo.destroy();
            this.cutsceneVideo = null;
        }

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