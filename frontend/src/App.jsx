import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import DashboardPage from './pages/DashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import { getToken } from './services/authService';

/**
 * Composant de route protegee.
 * Redirige vers /login si pas de token.
 *
 * @author Nirina
 * @version 1.0
 */
function ProtectedRoute({ children }) {
    const token = getToken();
    if (!token) {
        return <Navigate to="/login" replace />;
    }
    return children;
}

/**
 * Composant principal de l application.
 * Definit les routes de l application.
 *
 * @author Nirina
 * @version 1.0
 */
function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/verify-email" element={<VerifyEmailPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <DashboardPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/admin"
                    element={
                        <ProtectedRoute>
                            <AdminDashboardPage />
                        </ProtectedRoute>
                    }
                />
            </Routes>
        </BrowserRouter>
    );
}

export default App;