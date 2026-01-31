import { GameFlowManager } from '../../Core/GameFlowManager.js';
import { InputValidation } from '../../Core/InputValidation.js';

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
        const signupButton = document.getElementById('signup-button');

        backLink.onclick = () => {
            this.signupUI.style.display = 'none';
            this.scene.start('LoginScene'); 
        };

        signupButton.onclick = async () => {
            console.log('Handle Signup Reached');
            this.handleLogin();
        }
    }

    async handleLogin() {
        const status = document.getElementById('signup-status');
        const username = document.getElementById('signup-username').value;
        const password = document.getElementById('signup-password').value;
        const email = document.getElementById('signup-email').value;
        const dob = document.getElementById('signup-dob').value;

        // Case 1: One or more fields empty
        if (!username || !password || !email || !dob){
            status.textContent = "Please enter username and password";
            status.style.color = 'red';

            setTimeout(() => {
                status.textContent = "";
            }, 1500);
            return;
        }

        if (!InputValidation.validateUsername(username) || !InputValidation.validatePassword(password)
        || !InputValidation.validateEmail(email) || !InputValidation.validateDateOfBirth(dob)){
            status.textContent = "Invalid User Information";
            status.style.color = 'red';

            setTimeout(() => {
                status.textContent = "";
            }, 1500);
            return;
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