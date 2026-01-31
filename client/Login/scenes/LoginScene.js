import { GameFlowManager } from '../../Core/GameFlowManager.js';
import { GameState } from '../../Core/GameState.js';

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
    }

    create() {
        const bg = this.add.image(0, 0, 'background').setOrigin(0, 0);
        bg.setDisplaySize(this.scale.width, this.scale.height);

        if (!GameState.bgMusic) {
            GameState.bgMusic = this.sound.add('calmAdventureMusic', {
                volume: 0.6,
                loop: true
            });
            GameState.bgMusic.play(); 
        }

        this.loginUI = document.getElementById('login-ui');
        this.loginUI.style.display = 'flex';

        const loginButton = document.getElementById('login-button');
        const signupLink = document.getElementById('signup-link');

        signupLink.onclick = () => {
            this.loginUI.style.display = 'none';
            GameFlowManager.goToSignup(this);
        }

        loginButton.onclick = async () => {
            console.log('Handle Login Reached');
            this.handleLogin();
        }
    }

    async handleLogin() {
        const status = document.getElementById('login-status');
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        if (!username || !password){
            status.textContent = "Please enter username and password";
            status.style.color = 'red';

            setTimeout(() => {
                status.textContent = "";
            }, 1500);
            return;
        }

        try {
            const res = await fetch('https://climate-crusade.onrender.com/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
                
            const data = await res.json();

            if (!res.ok){
                status.textContent = "Username or Password Incorrect";
                status.style.color = 'red';

                setTimeout(() => {
                    status.textContent = "";
                }, 1500);

                return;
            }
                
            this.onLoginSuccess(data);
            
        } catch (error) {
            alert('Server error. Please try again.');
        }
    }


    async onLoginSuccess(data) {
        GameState.userId = data.user_id;
        GameState.isFirstTime = data.first_time_play;

        this.loginUI.style.display = 'none';

        if (GameState.isFirstTime) {
            await fetch('https://climate-crusade.onrender.com/mark-first-time-complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: GameState.userId })
            });

            GameFlowManager.goToFirstTimeCutscene(this);
        } else {
            GameFlowManager.goToLevelSelect(this);
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
