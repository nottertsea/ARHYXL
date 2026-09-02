const configuredApiUrl = window.ARHYXL_API_URL || '';
const API_BASE = configuredApiUrl || (window.location.protocol === 'file:' ? 'http://localhost:3000/api' : '/api');

const getAuthToken = () => localStorage.getItem('arhyxl-session-token');
const getSavedUser = () => JSON.parse(localStorage.getItem('arhyxl-user') || 'null');

const apiRequest = async (path, options = {}) => {
    const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) };
    const token = getAuthToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await response.json() : null;
    if (!response.ok) {
        const error = new Error(data?.error || 'Something went wrong.');
        error.status = response.status;
        throw error;
    }
    return data;
};

const saveSession = (data) => {
    localStorage.setItem('arhyxl-session-token', data.token);
    localStorage.setItem('arhyxl-user', JSON.stringify(data.user));
};

const clearSession = () => {
    localStorage.removeItem('arhyxl-session-token');
    localStorage.removeItem('arhyxl-user');
};

const redirectToLogin = () => {
    const next = `${window.location.pathname}${window.location.search}`;
    window.location.href = `login.html?next=${encodeURIComponent(next)}`;
};

const requireLogin = () => {
    if (!getAuthToken()) {
        redirectToLogin();
        return false;
    }
    return true;
};

const updateCartBadges = async () => {
    const badges = document.querySelectorAll('.cart-count');
    if (!badges.length || !getAuthToken()) return;
    try {
        const items = await apiRequest('/cart');
        const count = items.reduce((total, item) => total + item.quantity, 0);
        badges.forEach((badge) => { badge.textContent = count; });
    } catch (error) {
        if (error.status === 401) clearSession();
    }
};

const updateAuthAction = async () => {
    const loginLink = document.querySelector('.header-actions a[href="login.html"]');
    const signupLink = document.querySelector('.header-actions a[href="signup.html"]');
    if ((!loginLink && !signupLink) || !getAuthToken()) return;
    try {
        const data = await apiRequest('/me');
        const firstName = data.user.name.trim().split(/\s+/)[0];
        const actions = document.querySelector('.header-actions');
        const greeting = document.createElement('span');
        greeting.className = 'auth-greeting';
        greeting.textContent = `Hello, ${firstName}`;
        actions.prepend(greeting);

        const logoutLink = signupLink || loginLink;
        if (signupLink && loginLink) loginLink.remove();
        logoutLink.textContent = 'Logout';
        logoutLink.href = '#';
        logoutLink.addEventListener('click', async (event) => {
            event.preventDefault();
            try { await apiRequest('/auth/logout', { method: 'POST' }); } finally {
                clearSession();
                window.location.href = 'index.html';
            }
        });
    } catch (error) {
        if (error.status === 401) clearSession();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    updateCartBadges();
    updateAuthAction();
});
