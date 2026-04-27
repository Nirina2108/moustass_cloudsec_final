import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

/**
 * Point d entree de l application React.
 *
 * @author Nirina
 * @version 1.0
 */
createRoot(document.getElementById('root')).render(
    <StrictMode>
        <App />
    </StrictMode>
);