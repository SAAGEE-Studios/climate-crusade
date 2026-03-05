import { GameFlowManager } from '../../Core/GameFlowManager.js';
import { GameState } from '../../Core/GameState.js';
import { markFirstTimeComplete } from '../../Core/api.js';

export class FirstTimeCutsceneScene extends Phaser.Scene {

    constructor() {
        super('FirstTimeCutsceneScene');
        this.finished = false;
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
        this.cameras.main.fadeIn(200);
        this.events.on('shutdown', this.shutdown, this);

        const video = this.add.video(
            this.scale.width / 2,
            this.scale.height / 2,
            'cutscene1'
        ).setOrigin(0.5);

        video.setDisplaySize(this.scale.width / 7, this.scale.height / 4);
        video.setMute(false);
        video.play(true);

        if (GameState.bgMusic) {
            GameState.bgMusic.setMute(true);
        }

        // Show skip button
        this.skipUI = document.getElementById('skip-handler-1');
        this.skipUI.style.display = 'flex';

        const skipButton = document.getElementById('skip-button');
        skipButton.onclick = () => {
            video.stop();
            this.finishCutscene();
        };

        video.once('complete', () => {
            this.finishCutscene();
        });
    }

    async finishCutscene() {
        if (this.finished) return;
        this.finished = true;

        try {
            await markFirstTimeComplete(GameState.userId);
            GameState.isFirstTime = false;
        } catch (err) {
            console.error("Failed to mark first-time complete:", err);
        }

        if (GameState.bgMusic) {
            GameState.bgMusic.setMute(false);
        }

        this.cameras.main.fadeOut(300);

        this.cameras.main.once('camerafadeoutcomplete', () => {
            GameFlowManager.goToLevelSelect(this);
        });
    }

    shutdown() {
        if (this.skipSceneUI) {
            this.skipSceneUI.style.display = 'none';
        }
        
        if (this.skipUI) {
            this.skipUI.style.display = 'none';
        }
    }
}
