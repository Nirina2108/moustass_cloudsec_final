import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getClientProof, getMe, login, removeToken, saveToken } from '../services/authService';
import './LoginPage.css';

const IconShield = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
);

const IconMail = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 7l9 6 9-6" />
    </svg>
);

const IconLock = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="4" y="11" width="16" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
);

const IconEye = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

const IconEyeOff = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 3l18 18" />
        <path d="M10.6 10.6a3 3 0 0 0 4.2 4.2" />
        <path d="M9.9 5.1A10.5 10.5 0 0 1 12 5c6.5 0 10 7 10 7a17.7 17.7 0 0 1-3.3 4.3" />
        <path d="M6.6 6.6A17.6 17.6 0 0 0 2 12s3.5 7 10 7c1.7 0 3.2-.4 4.5-1" />
    </svg>
);

const IconKey = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="8" cy="14" r="4" />
        <path d="M11 11l9-9" />
        <path d="M16 6l3 3" />
    </svg>
);

const IconUsers = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="8" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.9" />
        <path d="M16 4a4 4 0 0 1 0 7.9" />
    </svg>
);

function LoginPage() {
    const [mode, setMode] = useState('user');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPwd, setShowPwd] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    const wantAdmin = mode === 'admin';

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const proof = await getClientProof(email, password);

            if (proof.error) {
                setError(proof.error);
                return;
            }

            const data = await login(proof.email, proof.nonce, proof.timestamp, proof.hmac);

            if (data.error) {
                setError(data.error);
                return;
            }

            saveToken(data.accessToken);
            const me = await getMe(data.accessToken);

            if (me?.error) {
                removeToken();
                setError('Impossible de verifier le profil.');
                return;
            }

            if (wantAdmin && !me?.isAdmin) {
                removeToken();
                setError("Ce compte n'a pas les droits administrateur.");
                return;
            }

            navigate(wantAdmin ? '/admin' : (me?.isAdmin ? '/admin' : '/dashboard'));
        } catch {
            setError('Erreur lors de la connexion. Veuillez reessayer.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="auth-layout">
                <aside className="auth-side">
                    <div className="auth-brand">
                        <span className="auth-logo">
                            <IconShield />
                        </span>
                        <span>Moustass CloudSec</span>
                    </div>
                    <h2 className="auth-tagline">
                        Communication audio chiffree de bout en bout
                    </h2>
                    <p className="auth-lead">
                        Plateforme securisee pour enregistrer, partager et facturer
                        vos contenus audio sans compromis sur la confidentialite.
                    </p>
                    <ul className="auth-features">
                        <li className="auth-feature">
                            <span className="auth-feature-icon"><IconKey /></span>
                            <span><strong>AES-256 + SHA-256</strong> Chiffrement et integrite garantis</span>
                        </li>
                        <li className="auth-feature">
                            <span className="auth-feature-icon"><IconShield /></span>
                            <span><strong>HMAC challenge</strong> Authentification sans mot de passe en clair</span>
                        </li>
                        <li className="auth-feature">
                            <span className="auth-feature-icon"><IconUsers /></span>
                            <span><strong>Gestion fine</strong> Roles admin / utilisateur dedies</span>
                        </li>
                    </ul>
                </aside>

                <main className="login-card">
                    <h1 className="login-title">
                        {wantAdmin ? 'Acces administrateur' : 'Connexion'}
                    </h1>
                    <p className="login-subtitle">
                        {wantAdmin
                            ? 'Reservee aux comptes avec droits eleves.'
                            : 'Bon retour ! Connectez-vous pour continuer.'}
                    </p>

                    <div className="login-role-toggle">
                        <button
                            type="button"
                            className={`login-role-option ${!wantAdmin ? 'active' : ''}`}
                            onClick={() => setMode('user')}
                            disabled={loading}
                        >
                            Utilisateur
                        </button>
                        <button
                            type="button"
                            className={`login-role-option ${wantAdmin ? 'active' : ''}`}
                            onClick={() => setMode('admin')}
                            disabled={loading}
                        >
                            Administrateur
                        </button>
                    </div>

                    {error && (
                        <p className="login-error">
                            <span>⚠</span>
                            <span>{error}</span>
                        </p>
                    )}

                    <form onSubmit={handleLogin} className="login-form">
                        <div className="auth-field">
                            <span className="auth-field-icon"><IconMail /></span>
                            <input
                                className="login-input"
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                            />
                        </div>
                        <div className="auth-field">
                            <span className="auth-field-icon"><IconLock /></span>
                            <input
                                className="login-input"
                                type={showPwd ? 'text' : 'password'}
                                placeholder="Mot de passe"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                className="auth-toggle-pwd"
                                onClick={() => setShowPwd((v) => !v)}
                                aria-label={showPwd ? 'Masquer' : 'Afficher'}
                                tabIndex={-1}
                            >
                                {showPwd ? <IconEyeOff /> : <IconEye />}
                            </button>
                        </div>
                        <button
                            className="login-button"
                            type="submit"
                            disabled={loading}
                        >
                            {loading
                                ? 'Connexion...'
                                : wantAdmin
                                    ? "Acceder a l'administration"
                                    : 'Se connecter'}
                        </button>
                    </form>

                    {!wantAdmin && (
                        <p className="login-link">
                            Pas encore inscrit ?{' '}
                            <span
                                className="login-link-text"
                                onClick={() => navigate('/register')}
                            >
                                S'inscrire
                            </span>
                        </p>
                    )}
                </main>
            </div>
        </div>
    );
}

export default LoginPage;
