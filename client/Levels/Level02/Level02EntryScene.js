import { GameFlowManager } from '../../Core/GameFlowManager.js';
import { GameState } from '../../Core/GameState.js';

export class Level02EntryScene extends Phaser.Scene {
    constructor() {
        super('Level02EntryScene');
    }

    preload() {
        // Create loading bar
        const bar = this.add.graphics();
        const box = this.add.graphics();
        box.lineStyle(2, 0x4ecdc4);
        box.strokeRect(200, 280, 400, 30);

        this.load.on("progress", (v) => {
            bar.clear();
            bar.fillStyle(0x4ecdc4);
            bar.fillRect(202, 282, 396 * v, 26);
        });
    }

    create() {
        this.scene.start("Level02GameScene");
    }
}