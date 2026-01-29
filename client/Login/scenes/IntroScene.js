import { GameFlowManager } from '../../Core/GameFlowManager.js';

export class IntroScene extends Phaser.Scene {
    constructor() {
        super('IntroScene');
    }

    preload() {
        this.load.video(
            'introVideo',
            './client/Shared/IntroScenes/IntroScreen1.mp4',
            'loadeddata',
            false,
            true
        );
    }

    create() {
        const video = this.add.video(this.scale.width/2,this.scale.height/2,'introVideo').setOrigin(0.5, 0.5);
        video.setDisplaySize(this.scale.width/16, this.scale.height/12);
        video.play(true);

        // When video finishes, move to login
        video.once('complete', () => {
            GameFlowManager.goToLogin(this);
        });

        // Safety fallback (in case browser blocks autoplay)
        this.time.delayedCall(5000, () => {
            if (this.scene.isActive('IntroScene')) {
                GameFlowManager.goToLogin(this);
            }
        });
    }
}