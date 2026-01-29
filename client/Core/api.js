
const BASE_URL = 'https://climate-crusade.onrender.com';

async function handleResponse (response) {
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Request failed')
    }

    return data;
}

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

export async function signup(userData) {
    const response = await fetch(`${BASE_URL}/progress/${userId}`);
    return handleResponse(response);
}


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