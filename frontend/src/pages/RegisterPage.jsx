import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { register } from '../services/authService';
import './RegisterPage.css';

const IconShield = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
);

const IconUser = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
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

const IconSparkle = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
    </svg>
);

function evaluatePassword(pwd) {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++;

    let label = 'Tres faible';
    let color = '#ef4444';
    if (score >= 5) { label = 'Excellent'; color = '#16a34a'; }
    else if (score === 4) { label = 'Fort'; color = '#22c55e'; }
    else if (score === 3) { label = 'Moyen'; color = '#eab308'; }
    else if (score === 2) { label = 'Faible'; color = '#f97316'; }

    return { score, label, color, percent: (score / 5) * 100 };
}

function RegisterPage() {
    const [mode, setMode] = useState('user');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPwd, setShowPwd] = useState(false);
    const [adminCode, setAdminCode] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    const wantAdmin = mode === 'admin';

    const strength = useMemo(() => evaluatePassword(password), [password]);
    const passwordOk = strength.score >= 3;

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        if (!passwordOk) {
            setError('Mot de passe trop faible. Au moins 8 caracteres avec majuscules, minuscules et chiffres.');
            return;
        }
        if (wantAdmin && !adminCode.trim()) {
            setError('Code administrateur obligatoire pour creer un compte admin.');
            return;
        }
        setLoading(true);

        try {
            const data = await register(name, email, password, {
                isAdmin: wantAdmin,
                adminCode: adminCode.trim(),
            });

            if (data.error) {
                setError(data.error);
            } else if (data.isAdmin) {
                setMessage((data.message || 'Inscription admin reussie.') + ' Redirection...');
                setTimeout(() => navigate('/login'), 1500);
            } else {
                setMessage((data.message || 'Inscription reussie.') + ' Redirection vers la verification...');
                const verifToken = data.emailVerificationToken;
                setTimeout(() => {
                    if (verifToken) {
                        navigate(`/verify-email?token=${encodeURIComponent(verifToken)}`);
                    } else {
                        navigate('/verify-email');
                    }
                }, 1500);
            }
        } catch {
            setError('Erreur lors de l inscription. Veuillez reessayer.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="register-container">
            <div className="auth-layout">
                <aside className="auth-side">
                    <div className="auth-brand">
                        <span className="auth-logo">
                            <IconShield />
                        </span>
                        <span>Moustass CloudSec</span>
                    </div>
                    <h2 className="auth-tagline">
                        Creez votre compte en quelques secondes
                    </h2>
                    <p className="auth-lead">
                        Vos donnees sont chiffrees, votre identite est protegee.
                        Rejoignez la plateforme et profitez d'un controle total
                        sur vos contenus audio.
                    </p>
                    <ul className="auth-features">
                        <li className="auth-feature">
                            <span className="auth-feature-icon"><IconKey /></span>
                            <span><strong>Cle RSA dediee</strong> Generee a l'inscription</span>
                        </li>
                        <li className="auth-feature">
                            <span className="auth-feature-icon"><IconShield /></span>
                            <span><strong>Email verifie</strong> Acces actif uniquement apres confirmation</span>
                        </li>
                        <li className="auth-feature">
                            <span className="auth-feature-icon"><IconSparkle /></span>
                            <span><strong>Politique stricte</strong> Mots de passe robustes obligatoires</span>
                        </li>
                    </ul>
                </aside>

                <main className="register-card">
                    <h1 className="register-title">
                        {wantAdmin ? 'Inscription administrateur' : 'Creer un compte'}
                    </h1>
                    <p className="register-subtitle">
                        {wantAdmin
                            ? 'Code administrateur requis.'
                            : 'C\'est rapide et gratuit.'}
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
                        <p className="register-error">
                            <span>⚠</span>
                            <span>{error}</span>
                        </p>
                    )}
                    {message && (
                        <p className="register-success">
                            <span>✓</span>
                            <span>{message}</span>
                        </p>
                    )}

                    <form onSubmit={handleRegister} className="register-form">
                        <div className="auth-field">
                            <span className="auth-field-icon"><IconUser /></span>
                            <input
                                className="register-input"
                                type="text"
                                placeholder="Nom complet"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                autoComplete="name"
                            />
                        </div>
                        <div className="auth-field">
                            <span className="auth-field-icon"><IconMail /></span>
                            <input
                                className="register-input"
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
                                className="register-input"
                                type={showPwd ? 'text' : 'password'}
                                placeholder="Mot de passe"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete="new-password"
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
                        {password && (
                            <div className="register-strength">
                                <div className="register-strength-bar">
                                    <div
                                        className="register-strength-fill"
                                        style={{
                                            width: `${strength.percent}%`,
                                            backgroundColor: strength.color,
                                            color: strength.color,
                                        }}
                                    />
                                </div>
                                <span
                                    className="register-strength-label"
                                    style={{ color: strength.color }}
                                >
                                    {strength.label}
                                </span>
                            </div>
                        )}
                        {wantAdmin && (
                            <>
                                <div className="auth-field">
                                    <span className="auth-field-icon"><IconKey /></span>
                                    <input
                                        className="register-input"
                                        type="password"
                                        placeholder="Code administrateur"
                                        value={adminCode}
                                        onChange={(e) => setAdminCode(e.target.value)}
                                        required
                                        autoComplete="off"
                                    />
                                </div>
                                <p className="register-hint">
                                    Le code admin est defini dans le panneau de configuration
                                    par un administrateur existant.
                                </p>
                            </>
                        )}
                        <button
                            className="register-button"
                            type="submit"
                            disabled={loading || !passwordOk}
                        >
                            {loading
                                ? 'Inscription...'
                                : wantAdmin
                                    ? "Creer le compte admin"
                                    : "Creer mon compte"}
                        </button>
                    </form>

                    <p className="register-link">
                        Deja inscrit ?{' '}
                        <span
                            className="register-link-text"
                            onClick={() => navigate('/login')}
                        >
                            Se connecter
                        </span>
                    </p>
                </main>
            </div>
        </div>
    );
}

export default RegisterPage;
