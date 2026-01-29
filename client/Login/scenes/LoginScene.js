export class LoginScene extends Phaser.Scene {

    constructor() {
        super('LoginScene');
    }

    preload() {
        this.load.image('background', './client/Shared/LoginScene/Background.png');
    }

    create() {
        const bg = this.add.image(0, 0, 'background').setOrigin(0, 0);
        bg.setDisplaySize(this.scale.width, this.scale.height);

        this.loginUI = document.getElementById('login-ui');
        this.loginUI.style.display = 'flex';
    }

    update() {
    }

    shutdown() {
        if (this.loginUI) {
            this.loginUI.style.display = 'none';
        }
    }
    
}
