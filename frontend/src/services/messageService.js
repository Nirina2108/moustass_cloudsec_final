import axios from 'axios';
import { getToken } from './authService';

const MESSAGE_URL = (import.meta.env.VITE_AUDIO_URL || 'http://localhost:8001/api/audio')
    .replace(/\/api\/audio\/?$/, '/api/messages');

const USERS_URL = (import.meta.env.VITE_AUTH_URL || 'http://localhost:8000/api/auth')
    .replace(/\/api\/auth\/?$/, '/api/users');

const authHeaders = () => ({
    headers: { Authorization: `Bearer ${getToken()}` },
});

export const listMessages = async (box = 'inbox') => {
    const response = await axios.get(`${MESSAGE_URL}?box=${box}`, authHeaders());
    return response.data;
};

export const getUnreadCount = async () => {
    const response = await axios.get(`${MESSAGE_URL}/unread-count`, authHeaders());
    return response.data?.count ?? 0;
};

export const sendMessage = async ({ receiverId, title, data, duration }) => {
    const response = await axios.post(
        MESSAGE_URL,
        { receiver_id: receiverId, title, data, duration },
        authHeaders()
    );
    return response.data;
};

export const getMessage = async (id) => {
    const response = await axios.get(`${MESSAGE_URL}/${id}`, authHeaders());
    return response.data;
};

export const markMessageRead = async (id) => {
    const response = await axios.put(`${MESSAGE_URL}/${id}/read`, {}, authHeaders());
    return response.data;
};

export const deleteMessage = async (id) => {
    const response = await axios.delete(`${MESSAGE_URL}/${id}`, authHeaders());
    return response.data;
};

export const listContacts = async () => {
    const response = await axios.get(USERS_URL, authHeaders());
    return Array.isArray(response.data) ? response.data : [];
};
