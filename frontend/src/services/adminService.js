import axios from 'axios';
import { getToken } from './authService';

const ADMIN_URL = (import.meta.env.VITE_AUTH_URL || 'http://localhost:8000/api/auth')
    .replace(/\/api\/auth\/?$/, '/api/admin');

const authHeaders = () => ({
    headers: { Authorization: `Bearer ${getToken()}` },
});

export const listUsers = async () => {
    const response = await axios.get(`${ADMIN_URL}/users`, authHeaders());
    return response.data;
};

export const createUser = async ({ name, email, password, isAdmin }) => {
    const response = await axios.post(
        `${ADMIN_URL}/users`,
        { name, email, password, isAdmin: !!isAdmin },
        authHeaders()
    );
    return response.data;
};

export const updateUser = async (id, payload) => {
    const response = await axios.put(`${ADMIN_URL}/users/${id}`, payload, authHeaders());
    return response.data;
};

export const deleteUser = async (id) => {
    const response = await axios.delete(`${ADMIN_URL}/users/${id}`, authHeaders());
    return response.data;
};

export const getRegistrationCode = async () => {
    const response = await axios.get(`${ADMIN_URL}/registration-code`, authHeaders());
    return response.data;
};

export const updateRegistrationCode = async (code) => {
    const response = await axios.put(
        `${ADMIN_URL}/registration-code`,
        { code },
        authHeaders()
    );
    return response.data;
};
