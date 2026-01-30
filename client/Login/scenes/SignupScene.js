import { GameFlowManager } from '../../Core/GameFlowManager.js';

export class SignupScene extends Phaser.Scene {
    constructor() {
        super('SignupScene');
    }

    preload() {
        this.load.image('signup_background', './client/Shared/LoginScene/SignupBackground.png');
    }

    create() {
        const bg = this.add.image(0, 0, 'signup_background').setOrigin(0, 0);
        bg.setDisplaySize(this.scale.width, this.scale.height);

        this.signupUI = document.getElementById('signup-ui');
        this.signupUI.style.display = 'flex';

        const backLink = document.getElementById('back-to-login');
        backLink.onclick = () => {
            this.signupUI.style.display = 'none';
            this.scene.start('LoginScene');
        };
    }

    update() {
    }

    shutdown() {
        if (this.signupUI) {
            this.signupUI.style.display = 'none';
        }
    }
}