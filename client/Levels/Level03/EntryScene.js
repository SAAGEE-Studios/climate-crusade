import { GameFlowManager } from '../../Core/GameFlowManager.js';
import { GameState } from '../../Core/GameState.js';

export class Level03EntryScene extends Phaser.Scene{

    constructor(){
        super('Level03EntryScene')
    }

    preload(){
        //Load cutscene assests
    }

    create(){
        this.scene.start('SunkenWellsLevel', {
            levelId: 'level03'
        });
    }

}