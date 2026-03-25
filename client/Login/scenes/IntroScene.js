import { GameFlowManager } from '../../Core/GameFlowManager.js';

/**
 * IntroScene
 * ----------
 * Plays the opening intro video when the game first loads.
 *
 * This scene handles autoplay restrictions, transitions to the
 * login screen once the video completes, and includes a fallback
 * timer in case video playback is blocked by the browser.
 */

export class IntroScene extends Phaser.Scene {
    constructor() {
        super('IntroScene');
    }

    preload() {
        console.log("Preload");
        this.load.video(
            'introVideo',
            'client/Shared/IntroScenes/IntroScreen1.mp4',
            'loadeddata',
            false,
            true
        );
    }

    create() {
        const video = this.add.video(this.scale.width/2,this.scale.height/2,'introVideo').setOrigin(0.5, 0.5);
        video.setDisplaySize(this.scale.width/15, this.scale.height/8.4);
        video.setMute(true);
        video.play(true);
        console.log("Create");
        console.log(video);

        this.input.once('pointerdown', () => {
            this.sound.context.resume();
            video.setMute(false);
        });

        // When video finishes, move to login
        video.once('complete', () => {
            GameFlowManager.goToLogin(this);
        });

        // Fallback transition in case autoplay fails or video does not trigger completion
        this.time.delayedCall(5000, () => {
            if (this.scene.isActive('IntroScene')) {
                GameFlowManager.goToLogin(this);
            }
        });
    }
}