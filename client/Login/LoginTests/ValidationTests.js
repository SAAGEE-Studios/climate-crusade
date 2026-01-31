import { InputValidation } from '../../Core/InputValidation.js';

export class ValidationTests extends Phaser.Scene {
    
    emailValidationTest(email) {
        if (InputValidation.validateEmail(email)) {
            console.log("Email: " + email + ", " + "Result: Valid email");
        } else {
            console.log("Email: " + email + ", " + "Result: Invalid email");
        };
    }

    usernameValidationTest(username) {
        if (InputValidation.validateUsername(username)) {
            console.log("Username: " + username + ", " + "Result: Valid username");
        } else {
            console.log("Username: " + username + ", " + "Result: Invalid username");
        };
    }

    passwordValidationTest(password) {
        if (InputValidation.validatePassword(password)) {
            console.log("Password: " + password + ", " + "Result: Valid password");
        } else {
            console.log("Password: " + password + ", " + "Result: Invalid password");
        };
    }

    dobValidationTest(dob) {
        if (InputValidation.validateDateOfBirth(dob)) {
            console.log("DOB: " + dob + ", " + "Result: Valid dob");
        } else {
            console.log("DOB: " + dob + ", " + "Result: Invalid dob");
        };
    }

    create() {
        const date = new Date();
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);

        // Email Validation
        console.log("Email Validation Tests:");
        this.emailValidationTest("raynowama@gmail.com");
        this.emailValidationTest("raynowama9gmail.com");
        this.emailValidationTest("ijsutenteredanythinglol.com");
        console.log("\n");

        // Username Validation
        console.log("Username Validation Tests:");
        this.usernameValidationTest("arol.nokamwafo");
        this.usernameValidationTest("ebitimi_dambo");
        this.usernameValidationTest("this_is_way_too_long");
        console.log("\n");

        // Password Validation
        console.log("Password Validation Tests:");
        this.passwordValidationTest("Password1!");
        this.passwordValidationTest("hunter2");
        this.passwordValidationTest("Pass word1!");
        console.log("\n");

        // Password Validation
        console.log("DOB Validation Tests:");
        this.dobValidationTest("2004-09-18");
        this.dobValidationTest("2030-09-18");
        this.dobValidationTest(nextDay);
        console.log("\n");
    }
}