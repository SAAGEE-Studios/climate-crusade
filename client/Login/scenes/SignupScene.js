import { GameFlowManager } from '../../Core/GameFlowManager.js';
import { InputValidation } from '../../Core/InputValidation.js';
import { signup } from '../../Core/api.js';

export class SignupScene extends Phaser.Scene {
    constructor() {
        super('SignupScene');
    }

    preload() {
        this.load.image('backgroundSignupScene', './client/Shared/LoginScene/SignupBackground.png');
        this.load.audio(
            'buttonclick',
            './client/Shared/Audio/UIButton1.mp3'
        );
    }

    create() {
        this.cameras.main.fadeIn(200);

        const bg = this.add.image(0, 0, 'backgroundSignupScene').setOrigin(0, 0);
        bg.setDisplaySize(this.scale.width, this.scale.height);

        this.signupUI = document.getElementById('signup-ui');
        this.signupUI.style.display = 'flex';

        const backLink = document.getElementById('back-to-login');
        const signupButton = document.getElementById('signup-button');
        const clickS = this.sound.add('buttonclick', { volume: 1 });

        backLink.onclick = () => {
            this.cameras.main.fadeOut(200);

            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.signupUI.style.display = 'none';
                GameFlowManager.goToLogin(this);
            });
        };

        signupButton.onclick = async () => {
            console.log('Handle Signup Reached');
            clickS.play();
            this.handleSignup();
        }
    }

    async handleSignup() {
        const status = document.getElementById('signup-status');
        const username = document.getElementById('signup-username').value;
        const password = document.getElementById('signup-password').value;
        const email = document.getElementById('signup-email').value;
        const dob = document.getElementById('signup-dob').value;

        // Case 1: One or more fields empty
        if (!username || !password || !email || !dob) {
            status.textContent = "Please enter username and password";
            status.style.color = 'red';

            setTimeout(() => {
                status.textContent = "";
            }, 1500);
            return;
        }

        if (!InputValidation.validateUsername(username) || !InputValidation.validatePassword(password)
            || !InputValidation.validateEmail(email) || !InputValidation.validateDateOfBirth(dob)) {
            status.textContent = "Invalid User Information";
            status.style.color = 'red';

            setTimeout(() => {
                status.textContent = "";
            }, 1500);

            return;
        }

        try {
            await signup({
                username,
                email,
                password,
                date_of_birth: dob
            });

            // SUCCESS
            status.textContent = 'Account created! You can now log in.';
            status.style.color = 'green';

            setTimeout(() => {
                status.textContent = '';
                this.signupUI.style.display = 'none';
                GameFlowManager.goToLogin(this);
            }, 1200);
        } catch (error) {
            status.textContent = error.message || 'Signup failed.';
            status.style.color = 'red';

            setTimeout(() => {
                status.textContent = "";
            }, 1200);
        }
    }

    update() {
    }

    shutdown() {
        if (this.signupUI) {
            this.signupUI.style.display = 'none';
        }
    }
}