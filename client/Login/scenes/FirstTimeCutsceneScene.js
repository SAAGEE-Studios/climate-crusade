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
        const video = this.add.video(this.scale.width/2,this.scale.height/2,'cutscene1').setOrigin(0.5, 0.5);
        video.setDisplaySize(this.scale.width/7, this.scale.height/4);
        video.setMute(false);
        video.play(true);

        if (GameState.bgMusic) {
            GameState.bgMusic.setMute(true)
        }
    }
}