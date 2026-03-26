/**
 * InputValidation
 * ----------------
 * Utility module responsible for validating user input fields
 * during authentication and account creation.
 *
 * This module centralizes validation logic for email, username,
 * password, and date of birth to ensure consistency and prevent
 * duplicate validation rules across scenes.
 *
 * Each function returns a boolean indicating whether the input
 * satisfies the required format and constraints.
 */

export const InputValidation = {
    validateEmail(email){
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        return emailPattern.test(email);
    },

    validateUsername(username){
        const usernamePattern = /^[a-z0-9_.]{5,15}$/;

        return usernamePattern.test(username);
    },

    validatePassword(password){
        const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])[^\s]{8,}$/;

        return passwordPattern.test(password);
    },

    validateDateOfBirth(dob){
        if (!dob) return false;

        const selectedDate = new Date(dob);
        const today = new Date();

        today.setHours(0, 0, 0, 0);

        return selectedDate <= today;
    }
};