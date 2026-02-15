import { GameFlowManager } from '../../Core/GameFlowManager.js';
import { GameState } from '../../Core/GameState.js';
import { login } from '../../Core/api.js';

export class LoginScene extends Phaser.Scene {

    constructor() {
        super('LoginScene');
    }

    preload() {
        this.load.image('background', './client/Shared/LoginScene/Background.png');
        this.load.audio(
            'calmAdventureMusic',
            './client/Shared/Audio/Climate Crusade Theme.wav'
        );
        this.load.audio(
            'buttonclick',
            './client/Shared/Audio/UIButton1.mp3'
        );
    }

    create() {
        const bg = this.add.image(0, 0, 'background').setOrigin(0, 0);
        bg.setDisplaySize(this.scale.width, this.scale.height);

        if (!GameState.bgMusic) {
            GameState.bgMusic = this.sound.add('calmAdventureMusic', {
                volume: 0.4,
                loop: true
            });
            GameState.bgMusic.play();
        }

        this.loginUI = document.getElementById('login-ui');
        this.loginUI.style.display = 'flex';

        const loginButton = document.getElementById('login-button');
        const signupLink = document.getElementById('signup-link');
        const click = this.sound.add('buttonclick', { volume: 1 });

        signupLink.onclick = () => {
            this.cameras.main.fadeOut(200);

            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.loginUI.style.display = 'none';
                GameFlowManager.goToSignup(this);
            });
        }

        loginButton.onclick = async () => {
            console.log('Handle Login Reached');
            click.play();
            this.handleLogin();
        }
    }

    async handleLogin() {
        const status = document.getElementById('login-status');
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        if (!username || !password) {
            status.textContent = "Please enter username and password";
            status.style.color = 'red';

            setTimeout(() => {
                status.textContent = "";
            }, 1500);
            return;
        }

        try {
            const data = await login(username, password);
            this.onLoginSuccess(data);
        } catch (error) {
            status.textContent = "Username or Password Incorrect";
            status.style.color = 'red';

            setTimeout(() => {
                status.textContent = "";
            }, 1500);
        }
    }


    async onLoginSuccess(data) {
        GameState.userId = data.user_id;
        GameState.isFirstTime = data.first_time_play;

        this.loginUI.style.display = 'none';
        console.log(data.first_time_play);

        if (GameState.isFirstTime) {
            this.cameras.main.fadeOut(200);

            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.time.delayedCall(500, () => {
                    GameFlowManager.goToFirstTimeCutscene(this);
                });
            });
        } else {
            this.cameras.main.fadeOut(200);

            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.time.delayedCall(500, () => {
                    GameFlowManager.goToLevelSelect(this);
                });
            });
        }
    }

    update() {
    }

    shutdown() {
        if (this.loginUI) {
            this.loginUI.style.display = 'none';
        }
    }

}
