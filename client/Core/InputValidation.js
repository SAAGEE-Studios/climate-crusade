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