import { GameFlowManager } from '../../Core/GameFlowManager.js';
import { GameState } from '../../Core/GameState.js';

export class FirstTimeCutsceneScene extends Phaser.Scene {
    constructor() {
        super('FirstTimeCutsceneScene');
    }

    preload() {
        this.load.video(
            'cutscene1',
            './client/Shared/IntroScenes/Cutscene_1.mp4',
            'loadeddata',
            false,
            true
        );
    }

    create() {
        this.events.on('shutdown', this.shutdown, this);

        this.skipSceneUI = document.getElementById('skip-handler-1');
        this.skipSceneUI.style.display = 'flex';

        const skipButton = document.getElementById('skip-button');

        const video = this.add.video(this.scale.width / 2, this.scale.height / 2, 'cutscene1').setOrigin(0.5, 0.5);
        video.setDisplaySize(this.scale.width / 7, this.scale.height / 4);
        video.setMute(false);
        video.play(true);

        if (GameState.bgMusic) {
            GameState.bgMusic.setMute(true)
        }

        video.once('complete', () => {
            this.finishCutscene();
        });

        //Skip button to be implemented later.
        skipButton.onclick = () => {
            video.stop();        // stop playback
            this.finishCutscene();
        };
    }

    async finishCutscene() {
        // Prevent double calls
        if (this.finished) return;
        this.finished = true;

        this.cameras.main.fadeOut(300);

        this.cameras.main.once('camerafadeoutcomplete', async () => {

            // Mark first time complete in backend
            await fetch('https://climate-crusade.onrender.com/mark-first-time-complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: GameState.userId })
            });

            GameState.isFirstTime = false;

            if (GameState.bgMusic) {
                GameState.bgMusic.setMute(false);
            }

            GameFlowManager.goToLevelSelect(this);
        });
    }


    shutdown(){
        if (this.skipSceneUI) {
            this.skipSceneUI.style.display = 'none';
        }

        if (this.skipButton) {
            this.skipButton.style.display = 'none';
        }
    }
}