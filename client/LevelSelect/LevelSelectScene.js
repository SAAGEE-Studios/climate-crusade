import { GameFlowManager } from '../Core/GameFlowManager.js';
import { GameState } from '../Core/GameState.js';

export class LevelSelectScene extends Phaser.Scene {
    constructor() {
        super('LevelSelectScene');
    }

    preload() {
        this.load.image('background', './client/Shared/LevelSelectScene/Background.png');
    }

    create() {
        const bg = this.add.image(0, 0, 'background').setOrigin(0, 0);
        bg.setDisplaySize(this.scale.width, this.scale.height);

        this.levelUI = document.getElementById('level-select-ui');
        

        // Test click
        const levelButton = this.levelUI.querySelector('.level-button');
        levelButton.onclick = () => {
            console.log('Level 1 clicked');
        };
    }
}