
const BASE_URL = 'https://climate-crusade.onrender.com';

/**
 * Handles API responses by parsing JSON and checking for errors.
 * 
 * @param {Response} response - The fetch response object.
 * @returns {Promise<Object>} Parsed JSON data if successful.
 * 
 * Throws an error if the response status is not OK.
 */

async function handleResponse (response) {
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Request failed')
    }

    return data;
}

/**
 * Sends a signup request to the backend API.
 * 
 * @param {Object} userData - An object containing the user's
 *                            username, email, password, and date of birth.
 * @returns {Promise<Object>} The parsed JSON response from the server.
 * 
 * Throws an error if the signup request fails.
 */

export async function signup(userData) {
    const response = await fetch(`${BASE_URL}/signup`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
    });

    return handleResponse(response);
}

/**
 * Sends a login request to the backend API.
 * 
 * @param {string} username - The user's username.
 * @param {string} password - The user's password.
 * @returns {Promise<Object>} The authenticated user data, including
 *                            user ID and first-time play status.
 * 
 * Throws an error if authentication fails.
 */

export async function login(username, password) {
    const response = await fetch(`${BASE_URL}/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({username, password})
    });

    return handleResponse(response);
}

/**
 * Retrieves saved level progress for a specific user.
 * 
 * @param {number|string} userId - The unique ID of the user.
 * @returns {Promise<Object>} An object containing progress data
 *                            for all completed levels.
 * 
 * Throws an error if the request fails.
 */

export async function getProgress(userId) {
    const response = await fetch(`${BASE_URL}/progress/${userId}`);
    return handleResponse(response);
}

/**
 * Saves the player's progress for a specific level.
 * 
 * @param {number|string} userId - The unique ID of the user.
 * @param {string} levelId - The ID of the completed level.
 * @param {number} starsCollected - The number of stars earned in the level.
 * @returns {Promise<Object>} The server response confirming save status.
 * 
 * Throws an error if the save request fails.
 */

export async function saveProgress(userId, levelId, starsCollected) {
    const response = await fetch(`${BASE_URL}/save-progress`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            user_id: userId,
            level_id: levelId, 
            stars_collected: starsCollected
        })
    });

    return handleResponse(response);
}

/**
 * Marks the user's first-time play status as completed.
 * 
 * @param {number|string} userId - The unique ID of the user.
 * @returns {Promise<Object>} The server response confirming update.
 * 
 * Throws an error if the request fails.
 */

export async function markFirstTimeComplete(userId) {
    const response = await fetch(`${BASE_URL}/mark-first-time-complete`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({user_id: userId})
    });

    return handleResponse(response);
}

/**
 * Sends a request to permanently delete a user account.
 * 
 * @param {number|string} userId - The unique ID of the user.
 * @param {string} password - The user's password for confirmation.
 * @returns {Promise<Object>} The server response confirming deletion.
 * 
 * Throws an error if deletion fails or credentials are incorrect.
 */

export async function deleteAccount(userId, password) {
    const response = await fetch(`${BASE_URL}/delete-account`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({user_id: userId, password})
    });

    return handleResponse(response);
}