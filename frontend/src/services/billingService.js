import axios from 'axios';
import { getToken } from './authService';

/**
 * Service de gestion des factures.
 * Communique avec le billing-service Laravel.
 *
 * @author Nirina
 * @version 1.0
 */

const BILLING_URL = import.meta.env.VITE_BILLING_URL || 'http://localhost:8002/api/invoices';

/**
 * Headers avec le token JWT.
 *
 * @returns {Object}
 */
const authHeaders = () => ({
    headers: { Authorization: `Bearer ${getToken()}` },
});

/**
 * Recupere toutes les factures.
 *
 * @returns {Promise}
 */
export const getInvoices = async () => {
    const response = await axios.get(BILLING_URL, authHeaders());
    return response.data;
};

/**
 * Cree une facture.
 * Compatible ancien et nouveau format :
 *  - createInvoice(amount, description, dueDate)
 *  - createInvoice({ items, customer_name, ... })
 *
 * @returns {Promise}
 */
export const createInvoice = async (...args) => {
    let payload;
    if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
        payload = args[0];
    } else {
        const [amount, description, dueDate] = args;
        payload = { amount, description, due_date: dueDate };
    }
    const response = await axios.post(BILLING_URL, payload, authHeaders());
    return response.data;
};

/**
 * Recupere une facture par id.
 *
 * @param {number} id
 * @returns {Promise}
 */
export const getInvoice = async (id) => {
    const response = await axios.get(`${BILLING_URL}/${id}`, authHeaders());
    return response.data;
};

/**
 * Paie une facture.
 *
 * @param {number} id
 * @returns {Promise}
 */
export const payInvoice = async (id) => {
    const response = await axios.put(
        `${BILLING_URL}/${id}/pay`,
        {},
        authHeaders()
    );
    return response.data;
};

/**
 * Supprime une facture.
 *
 * @param {number} id
 * @returns {Promise}
 */
export const deleteInvoice = async (id) => {
    const response = await axios.delete(`${BILLING_URL}/${id}`, authHeaders());
    return response.data;
};