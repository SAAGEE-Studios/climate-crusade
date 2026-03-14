import { GameFlowManager } from '../../Core/GameFlowManager.js';
import { GameState } from '../../Core/GameState.js';
import { login } from '../../Core/api.js';

export class LoginScene extends Phaser.Scene {

    constructor() {
        super('LoginScene');
    }

    preload() {
        this.load.image('backgroundLoginScene', './client/Shared/LoginScene/Background.png');
        this.load.audio('calmAdventureMusic', './client/Shared/Audio/Climate Crusade Theme.wav');
        this.load.audio('buttonclick', './client/Shared/Audio/UIButton1.mp3');
    }

    create() {
        const bg = this.add.image(0, 0, 'backgroundLoginScene').setOrigin(0, 0);
        bg.setDisplaySize(this.scale.width, this.scale.height);
        this.events.on('shutdown', this.shutdown, this);

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
        };

        loginButton.onclick = async () => {
            click.play();
            await this.handleLogin();
        };
    }

    async handleLogin() {
        const status = document.getElementById('login-status');
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        if (!username || !password) {
            status.textContent = "Please enter username and password";
            status.style.color = 'red';
            setTimeout(() => status.textContent = "", 1500);
            return;
        }

        try {
            const data = await login(username, password);

            status.textContent = "Logging  in.....";
            status.style.color = 'green';

            GameState.userId = data.user_id;
            GameState.isFirstTime = data.first_time_play;

            setTimeout(() => {
                status.textContent = "";
                this.loginUI.style.display = 'none';

                this.cameras.main.fadeOut(200);

                this.cameras.main.once('camerafadeoutcomplete', () => {
                    if (GameState.isFirstTime) {
                        GameFlowManager.goToFirstTimeCutscene(this);
                    } else {
                        GameFlowManager.goToLevelSelect(this);
                    }
                });
            }, 2000);

        } catch (err) {
            status.textContent = "Username or Password Incorrect";
            status.style.color = 'red';
            setTimeout(() => status.textContent = "", 1500);
        }
    }

    shutdown() {
        if (GameState.bgMusic) {
            GameState.bgMusic.stop();
            GameState.bgMusic = null;
        }

        if (this.loginUI) {
            this.loginUI.style.display = 'none';
        }
    }
}
