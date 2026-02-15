import { GameFlowManager } from '../../Core/GameFlowManager.js';
import { GameState } from '../../Core/GameState.js';

export class AcidDownpourLevel extends Phaser.Scene {

    constructor() {
        super('AcidDownpourLevel');
    }

    preload() {
        this.load.image('Level01Background', '../Assets/Backgrounds/Thailand_Backdrop.png');
    }

    create() {
        const bg = this.add.image(0, 0, 'Level01Background').setOrigin(0, 0);
        bg.setDisplaySize(this.scale.width, this.scale.height);
    }
}