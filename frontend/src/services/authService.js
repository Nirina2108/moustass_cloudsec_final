import axios from 'axios';

/**
 * Service d authentification.
 * Communique avec l auth-service Spring Boot.
 *
 * @author Nirina
 * @version 1.0
 */

const AUTH_URL = import.meta.env.VITE_AUTH_URL || 'http://localhost:8000/api/auth';
const TOKEN_KEY = 'accessToken';

// Intercepteur global : si une requete authentifiee renvoie 401,
// on supprime le token et on redirige vers /login (sauf si on y est deja).
axios.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error?.response?.status;
        const hadToken = !!localStorage.getItem(TOKEN_KEY);
        const onAuthPage = /\/(login|register|verify-email)$/.test(window.location.pathname);
        if (status === 401 && hadToken && !onAuthPage) {
            localStorage.removeItem(TOKEN_KEY);
            window.location.replace('/login');
        }
        return Promise.reject(error);
    }
);

/**
 * Inscrit un nouvel utilisateur.
 *
 * @param {string} name
 * @param {string} email
 * @param {string} password
 * @param {Object} [options]
 * @param {boolean} [options.isAdmin=false]
 * @param {string} [options.adminCode]
 * @returns {Promise}
 */
export const register = async (name, email, password, options = {}) => {
    const response = await axios.post(`${AUTH_URL}/register`, {
        name,
        email,
        password,
        isAdmin: !!options.isAdmin,
        adminCode: options.adminCode || '',
    });
    return response.data;
};

/**
 * Verifie l email avec le token de verification.
 *
 * @param {string} token
 * @returns {Promise}
 */
export const verifyEmail = async (token) => {
    const response = await axios.get(`${AUTH_URL}/verify-email`, {
        params: { token },
    });
    return response.data;
};

/**
 * Demande une preuve client HMAC.
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise}
 */
export const getClientProof = async (email, password) => {
    const response = await axios.post(`${AUTH_URL}/client-proof`, {
        email,
        password,
    });
    return response.data;
};

/**
 * Connecte un utilisateur avec HMAC.
 *
 * @param {string} email
 * @param {string} nonce
 * @param {number} timestamp
 * @param {string} hmac
 * @returns {Promise}
 */
export const login = async (email, nonce, timestamp, hmac) => {
    const response = await axios.post(`${AUTH_URL}/login`, {
        email,
        nonce,
        timestamp,
        hmac,
    });
    return response.data;
};

/**
 * Recupere les informations de l utilisateur connecte.
 *
 * @param {string} token
 * @returns {Promise}
 */
export const getMe = async (token) => {
    const response = await axios.get(`${AUTH_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
};

/**
 * Deconnecte l utilisateur.
 *
 * @param {string} token
 * @returns {Promise}
 */
export const logout = async (token) => {
    const response = await axios.post(
        `${AUTH_URL}/logout`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
};

/**
 * Change le mot de passe de l utilisateur connecte.
 *
 * @param {string} token
 * @param {string} oldPassword
 * @param {string} newPassword
 * @returns {Promise}
 */
export const changePassword = async (token, oldPassword, newPassword) => {
    const response = await axios.put(
        `${AUTH_URL}/change-password`,
        { oldPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
};

/**
 * Sauvegarde le token dans le localStorage.
 *
 * @param {string} token
 */
export const saveToken = (token) => {
    localStorage.setItem(TOKEN_KEY, token);
};

/**
 * Recupere le token depuis le localStorage.
 *
 * @returns {string|null}
 */
export const getToken = () => {
    return localStorage.getItem(TOKEN_KEY);
};

/**
 * Supprime le token du localStorage.
 */
export const removeToken = () => {
    localStorage.removeItem(TOKEN_KEY);
};