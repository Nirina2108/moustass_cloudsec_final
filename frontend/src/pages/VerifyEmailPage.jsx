import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { verifyEmail } from '../services/authService';
import './RegisterPage.css';

const IconShield = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
);

const IconBadge = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 12l5 5 9-11" />
    </svg>
);

const IconHash = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18" />
    </svg>
);

function VerifyEmailPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [token, setToken] = useState(searchParams.get('token') || '');
    const [status, setStatus] = useState('idle');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const submit = async (value) => {
        if (!value) return;
        setStatus('loading');
        setError('');
        setMessage('');
        try {
            const data = await verifyEmail(value);
            if (data.error) {
                setError(data.error);
                setStatus('error');
            } else {
                setMessage(data.message || 'Email confirme.');
                setStatus('success');
            }
        } catch {
            setError('Erreur lors de la verification. Le token est peut-etre invalide ou expire.');
            setStatus('error');
        }
    };

    useEffect(() => {
        const urlToken = searchParams.get('token');
        if (urlToken) {
            submit(urlToken);
        }
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        submit(token);
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
                        Confirmez votre adresse email
                    </h2>
                    <p className="auth-lead">
                        Une derniere etape avant d'acceder a votre compte. Collez le
                        token recu, ou cliquez sur le lien dans le mail.
                    </p>
                </aside>

                <main className="register-card">
                    <h1 className="register-title">Verification d'email</h1>
                    <p className="register-subtitle">
                        Saisissez le token de confirmation pour activer votre compte.
                    </p>

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

                    {status !== 'success' && (
                        <form onSubmit={handleSubmit} className="register-form">
                            <div className="auth-field">
                                <span className="auth-field-icon"><IconHash /></span>
                                <input
                                    className="register-input"
                                    type="text"
                                    placeholder="Token de verification"
                                    value={token}
                                    onChange={(e) => setToken(e.target.value)}
                                    required
                                    autoComplete="off"
                                />
                            </div>
                            <button
                                className="register-button"
                                type="submit"
                                disabled={status === 'loading'}
                            >
                                {status === 'loading' ? 'Verification...' : 'Verifier mon email'}
                            </button>
                        </form>
                    )}

                    {status === 'success' && (
                        <button
                            className="register-button"
                            onClick={() => navigate('/login')}
                        >
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                <IconBadge />
                                Aller a la connexion
                            </span>
                        </button>
                    )}

                    <p className="register-link">
                        Retour a la{' '}
                        <span
                            className="register-link-text"
                            onClick={() => navigate('/login')}
                        >
                            connexion
                        </span>
                    </p>
                </main>
            </div>
        </div>
    );
}

export default VerifyEmailPage;
