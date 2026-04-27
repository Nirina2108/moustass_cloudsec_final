import axios from 'axios';
import { getToken } from './authService';

/**
 * Service de gestion des enregistrements audio.
 * Communique avec l audio-service Laravel.
 *
 * @author Nirina
 * @version 1.0
 */

const AUDIO_URL = import.meta.env.VITE_AUDIO_URL || 'http://localhost:8001/api/audio';

/**
 * Headers avec le token JWT.
 *
 * @returns {Object}
 */
const authHeaders = () => ({
    headers: { Authorization: `Bearer ${getToken()}` },
});

/**
 * Recupere tous les enregistrements audio.
 *
 * @returns {Promise}
 */
export const getAudios = async () => {
    const response = await axios.get(AUDIO_URL, authHeaders());
    return response.data;
};

/**
 * Cree un enregistrement audio.
 *
 * @param {string} title
 * @param {string} data
 * @param {number} duration
 * @returns {Promise}
 */
export const createAudio = async (title, data, duration = 0) => {
    const response = await axios.post(
        AUDIO_URL,
        { title, data, duration },
        authHeaders()
    );
    return response.data;
};

/**
 * Recupere un enregistrement audio par id.
 *
 * @param {number} id
 * @returns {Promise}
 */
export const getAudio = async (id) => {
    const response = await axios.get(`${AUDIO_URL}/${id}`, authHeaders());
    return response.data;
};

/**
 * Met a jour un enregistrement audio.
 *
 * @param {number} id
 * @param {Object} data
 * @returns {Promise}
 */
export const updateAudio = async (id, data) => {
    const response = await axios.put(`${AUDIO_URL}/${id}`, data, authHeaders());
    return response.data;
};

/**
 * Supprime un enregistrement audio.
 *
 * @param {number} id
 * @returns {Promise}
 */
export const deleteAudio = async (id) => {
    const response = await axios.delete(`${AUDIO_URL}/${id}`, authHeaders());
    return response.data;
};