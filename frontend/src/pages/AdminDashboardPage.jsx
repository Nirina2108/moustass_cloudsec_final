import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMe, getToken, logout, removeToken } from '../services/authService';
import {
    listUsers,
    updateUser,
    deleteUser,
    createUser,
    getRegistrationCode,
    updateRegistrationCode,
} from '../services/adminService';
import './AdminDashboardPage.css';

function AdminDashboardPage() {
    const [me, setMe] = useState(null);
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(true);

    const [createOpen, setCreateOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newIsAdmin, setNewIsAdmin] = useState(false);
    const [creating, setCreating] = useState(false);

    const [adminCode, setAdminCode] = useState('');
    const [codeRevealed, setCodeRevealed] = useState(false);
    const [codeOpen, setCodeOpen] = useState(false);
    const [newCode, setNewCode] = useState('');
    const [rotating, setRotating] = useState(false);

    const [editOpen, setEditOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editIsAdmin, setEditIsAdmin] = useState(false);
    const [editEmailVerified, setEditEmailVerified] = useState(false);
    const [saving, setSaving] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        const token = getToken();
        if (!token) {
            navigate('/login');
            return;
        }
        bootstrap();
    }, []);

    const bootstrap = async () => {
        try {
            const meData = await getMe(getToken());
            if (meData.error || !meData.isAdmin) {
                navigate('/dashboard');
                return;
            }
            setMe(meData);
            await Promise.all([loadUsers(), loadCode()]);
        } catch {
            navigate('/login');
        } finally {
            setLoading(false);
        }
    };

    const loadCode = async () => {
        try {
            const data = await getRegistrationCode();
            setAdminCode(data?.code || '');
        } catch {
            // silencieux : pas de blocage si l endpoint echoue
        }
    };

    const loadUsers = async () => {
        try {
            const data = await listUsers();
            setUsers(Array.isArray(data) ? data : []);
        } catch {
            setError('Erreur lors du chargement des utilisateurs.');
        }
    };

    const handleLogout = async () => {
        try {
            await logout(getToken());
        } finally {
            removeToken();
            navigate('/login');
        }
    };

    const flash = (msg, isError = false) => {
        if (isError) {
            setError(msg);
            setSuccess('');
        } else {
            setSuccess(msg);
            setError('');
        }
        setTimeout(() => {
            setError('');
            setSuccess('');
        }, 3000);
    };

    const handleToggleAdmin = async (user) => {
        try {
            await updateUser(user.id, { isAdmin: !user.isAdmin });
            flash(`Statut admin ${!user.isAdmin ? 'attribue' : 'retire'} pour ${user.email}.`);
            loadUsers();
        } catch (err) {
            flash(err?.response?.data?.error || 'Erreur lors de la mise a jour.', true);
        }
    };

    const handleVerify = async (user) => {
        try {
            await updateUser(user.id, { emailVerified: true });
            flash(`Email verifie pour ${user.email}.`);
            loadUsers();
        } catch (err) {
            flash(err?.response?.data?.error || 'Erreur lors de la verification.', true);
        }
    };

    const handleDelete = async (user) => {
        if (!window.confirm(`Supprimer definitivement ${user.email} ?`)) return;
        try {
            await deleteUser(user.id);
            flash(`${user.email} supprime.`);
            loadUsers();
        } catch (err) {
            flash(err?.response?.data?.error || 'Erreur lors de la suppression.', true);
        }
    };

    const openCreate = (asAdmin = false) => {
        setNewName('');
        setNewEmail('');
        setNewPassword('');
        setNewIsAdmin(asAdmin);
        setCreateOpen(true);
    };

    const closeCreate = () => {
        if (creating) return;
        setCreateOpen(false);
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setCreating(true);
        try {
            await createUser({
                name: newName,
                email: newEmail,
                password: newPassword,
                isAdmin: newIsAdmin,
            });
            flash(
                `${newEmail} cree (${newIsAdmin ? 'admin' : 'utilisateur simple'}).`
            );
            setCreateOpen(false);
            loadUsers();
        } catch (err) {
            flash(err?.response?.data?.error || 'Erreur lors de la creation.', true);
        } finally {
            setCreating(false);
        }
    };

    const openEdit = (user) => {
        setEditingUser(user);
        setEditName(user.name || '');
        setEditEmail(user.email || '');
        setEditIsAdmin(!!user.isAdmin);
        setEditEmailVerified(!!user.emailVerified);
        setEditOpen(true);
    };

    const closeEdit = () => {
        if (saving) return;
        setEditOpen(false);
        setEditingUser(null);
    };

    const handleEdit = async (e) => {
        e.preventDefault();
        if (!editingUser) return;
        if (!editName.trim() || !editEmail.trim()) {
            flash('Nom et email obligatoires.', true);
            return;
        }
        setSaving(true);
        try {
            const payload = {};
            if (editName !== editingUser.name) payload.name = editName.trim();
            if (editEmail !== editingUser.email) payload.email = editEmail.trim();
            if (editIsAdmin !== editingUser.isAdmin) payload.isAdmin = editIsAdmin;
            if (editEmailVerified !== editingUser.emailVerified) payload.emailVerified = editEmailVerified;

            if (Object.keys(payload).length === 0) {
                setEditOpen(false);
                return;
            }

            await updateUser(editingUser.id, payload);
            flash(`${editingUser.email} mis a jour.`);
            setEditOpen(false);
            setEditingUser(null);
            loadUsers();
        } catch (err) {
            flash(err?.response?.data?.error || 'Erreur lors de la mise a jour.', true);
        } finally {
            setSaving(false);
        }
    };

    const openRotate = () => {
        setNewCode('');
        setCodeOpen(true);
    };

    const closeRotate = () => {
        if (rotating) return;
        setCodeOpen(false);
    };

    const handleRotateCode = async (e) => {
        e.preventDefault();
        if (newCode.trim().length < 8) {
            flash('Le code doit faire au moins 8 caracteres.', true);
            return;
        }
        setRotating(true);
        try {
            const data = await updateRegistrationCode(newCode.trim());
            setAdminCode(data?.code || newCode.trim());
            setCodeRevealed(true);
            flash('Code d inscription admin mis a jour.');
            setCodeOpen(false);
        } catch (err) {
            flash(err?.response?.data?.error || 'Erreur lors de la rotation.', true);
        } finally {
            setRotating(false);
        }
    };

    const copyCodeToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(adminCode);
            flash('Code copie dans le presse-papier.');
        } catch {
            flash('Copie impossible.', true);
        }
    };

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return users;
        return users.filter(
            (u) =>
                u.name?.toLowerCase().includes(q) ||
                u.email?.toLowerCase().includes(q)
        );
    }, [users, search]);

    const stats = useMemo(() => {
        const verified = users.filter((u) => u.emailVerified).length;
        const admins = users.filter((u) => u.isAdmin).length;
        return { total: users.length, verified, admins };
    }, [users]);

    if (loading) {
        return (
            <div className="admin-loader">
                <div className="admin-spinner" />
            </div>
        );
    }

    return (
        <div className="admin-shell">
            <aside className="admin-sidebar">
                <div className="admin-brand">
                    <span className="admin-brand-dot" />
                    <span>Moustass CloudSec</span>
                </div>
                <nav className="admin-nav">
                    <button className="admin-nav-item active">
                        <span className="admin-nav-icon">U</span>
                        Utilisateurs
                    </button>
                    <button
                        className="admin-nav-item"
                        onClick={() => navigate('/dashboard')}
                    >
                        <span className="admin-nav-icon">D</span>
                        Mon espace
                    </button>
                </nav>
                <div className="admin-sidebar-footer">
                    <div className="admin-user-card">
                        <div className="admin-avatar">{me?.name?.[0]?.toUpperCase() || 'A'}</div>
                        <div className="admin-user-meta">
                            <span className="admin-user-name">{me?.name}</span>
                            <span className="admin-user-role">Administrateur</span>
                        </div>
                    </div>
                    <button className="admin-logout" onClick={handleLogout}>
                        Deconnexion
                    </button>
                </div>
            </aside>

            <main className="admin-main">
                <header className="admin-header">
                    <div>
                        <h1 className="admin-title">Gestion des utilisateurs</h1>
                        <p className="admin-subtitle">
                            Administrez les comptes, rôles et statuts de vérification.
                        </p>
                    </div>
                    <div className="admin-header-actions">
                        <input
                            type="search"
                            className="admin-search"
                            placeholder="Rechercher par nom ou email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <button
                            className="admin-cta admin-cta-secondary"
                            onClick={() => openCreate(false)}
                        >
                            + Utilisateur
                        </button>
                        <button
                            className="admin-cta admin-cta-primary"
                            onClick={() => openCreate(true)}
                        >
                            + Admin
                        </button>
                    </div>
                </header>

                <section className="admin-stats">
                    <div className="admin-stat">
                        <span className="admin-stat-value">{stats.total}</span>
                        <span className="admin-stat-label">Comptes</span>
                    </div>
                    <div className="admin-stat">
                        <span className="admin-stat-value">{stats.verified}</span>
                        <span className="admin-stat-label">Verifies</span>
                    </div>
                    <div className="admin-stat">
                        <span className="admin-stat-value">{stats.admins}</span>
                        <span className="admin-stat-label">Admins</span>
                    </div>
                </section>

                <section className="admin-code-card">
                    <div className="admin-code-info">
                        <span className="admin-code-label">Code d'inscription admin</span>
                        <span className="admin-code-hint">
                            Necessaire pour creer un compte admin via la page d'inscription publique.
                        </span>
                    </div>
                    <div className="admin-code-value">
                        <code>
                            {codeRevealed
                                ? adminCode
                                : '•'.repeat(Math.max(8, adminCode.length || 12))}
                        </code>
                        <button
                            type="button"
                            className="admin-action"
                            onClick={() => setCodeRevealed((v) => !v)}
                            disabled={!adminCode}
                        >
                            {codeRevealed ? 'Masquer' : 'Reveler'}
                        </button>
                        <button
                            type="button"
                            className="admin-action"
                            onClick={copyCodeToClipboard}
                            disabled={!adminCode}
                        >
                            Copier
                        </button>
                        <button
                            type="button"
                            className="admin-cta admin-cta-primary admin-cta-sm"
                            onClick={openRotate}
                        >
                            Rotation
                        </button>
                    </div>
                </section>

                {error && <div className="admin-alert admin-alert-error">{error}</div>}
                {success && <div className="admin-alert admin-alert-success">{success}</div>}

                <div className="admin-table-wrapper">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Utilisateur</th>
                                <th>Email</th>
                                <th>Statut</th>
                                <th>Rôle</th>
                                <th>Inscription</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="admin-empty">
                                        Aucun utilisateur.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((u) => {
                                    const isSelf = me && me.id === u.id;
                                    return (
                                        <tr key={u.id}>
                                            <td>
                                                <div className="admin-user-cell">
                                                    <div className="admin-avatar admin-avatar-sm">
                                                        {u.name?.[0]?.toUpperCase() || '?'}
                                                    </div>
                                                    <span>{u.name}</span>
                                                </div>
                                            </td>
                                            <td className="admin-mono">{u.email}</td>
                                            <td>
                                                <span
                                                    className={`admin-badge ${
                                                        u.emailVerified
                                                            ? 'admin-badge-success'
                                                            : 'admin-badge-warning'
                                                    }`}
                                                >
                                                    {u.emailVerified ? 'Verifie' : 'En attente'}
                                                </span>
                                            </td>
                                            <td>
                                                <span
                                                    className={`admin-badge ${
                                                        u.isAdmin
                                                            ? 'admin-badge-primary'
                                                            : 'admin-badge-neutral'
                                                    }`}
                                                >
                                                    {u.isAdmin ? 'Admin' : 'Utilisateur'}
                                                </span>
                                            </td>
                                            <td className="admin-muted">
                                                {u.createdAt
                                                    ? new Date(u.createdAt).toLocaleDateString()
                                                    : '—'}
                                            </td>
                                            <td>
                                                <div className="admin-actions">
                                                    <button
                                                        className="admin-action"
                                                        onClick={() => openEdit(u)}
                                                        title="Modifier l'utilisateur"
                                                    >
                                                        Modifier
                                                    </button>
                                                    {!u.emailVerified && (
                                                        <button
                                                            className="admin-action admin-action-success"
                                                            onClick={() => handleVerify(u)}
                                                            title="Forcer la verification"
                                                        >
                                                            Verifier
                                                        </button>
                                                    )}
                                                    <button
                                                        className="admin-action"
                                                        onClick={() => handleToggleAdmin(u)}
                                                        disabled={isSelf}
                                                        title={
                                                            isSelf
                                                                ? 'Vous ne pouvez pas modifier votre propre role'
                                                                : ''
                                                        }
                                                    >
                                                        {u.isAdmin ? 'Retirer admin' : 'Promouvoir'}
                                                    </button>
                                                    <button
                                                        className="admin-action admin-action-danger"
                                                        onClick={() => handleDelete(u)}
                                                        disabled={isSelf}
                                                        title={
                                                            isSelf
                                                                ? 'Vous ne pouvez pas supprimer votre propre compte'
                                                                : ''
                                                        }
                                                    >
                                                        Supprimer
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </main>

            {createOpen && (
                <div className="admin-modal-backdrop" onClick={closeCreate}>
                    <div
                        className="admin-modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="admin-modal-header">
                            <h2 className="admin-modal-title">
                                {newIsAdmin ? 'Nouvel administrateur' : 'Nouvel utilisateur'}
                            </h2>
                            <button
                                className="admin-modal-close"
                                onClick={closeCreate}
                                disabled={creating}
                                aria-label="Fermer"
                            >
                                ×
                            </button>
                        </div>
                        <form onSubmit={handleCreate} className="admin-modal-form">
                            <div className="admin-role-toggle">
                                <button
                                    type="button"
                                    className={`admin-role-option ${
                                        !newIsAdmin ? 'active' : ''
                                    }`}
                                    onClick={() => setNewIsAdmin(false)}
                                >
                                    Utilisateur simple
                                </button>
                                <button
                                    type="button"
                                    className={`admin-role-option ${
                                        newIsAdmin ? 'active' : ''
                                    }`}
                                    onClick={() => setNewIsAdmin(true)}
                                >
                                    Administrateur
                                </button>
                            </div>
                            <input
                                className="admin-input"
                                type="text"
                                placeholder="Nom"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                required
                                autoFocus
                            />
                            <input
                                className="admin-input"
                                type="email"
                                placeholder="Email"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                required
                            />
                            <input
                                className="admin-input"
                                type="password"
                                placeholder="Mot de passe"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                            />
                            <p className="admin-modal-hint">
                                L'email sera marqué comme vérifié automatiquement.
                            </p>
                            <div className="admin-modal-actions">
                                <button
                                    type="button"
                                    className="admin-action"
                                    onClick={closeCreate}
                                    disabled={creating}
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="admin-cta admin-cta-primary"
                                    disabled={creating}
                                >
                                    {creating ? 'Creation...' : 'Creer le compte'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {editOpen && editingUser && (
                <div className="admin-modal-backdrop" onClick={closeEdit}>
                    <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="admin-modal-header">
                            <h2 className="admin-modal-title">
                                Modifier {editingUser.name}
                            </h2>
                            <button
                                className="admin-modal-close"
                                onClick={closeEdit}
                                disabled={saving}
                                aria-label="Fermer"
                            >
                                ×
                            </button>
                        </div>
                        <form onSubmit={handleEdit} className="admin-modal-form">
                            <div className="admin-role-toggle">
                                <button
                                    type="button"
                                    className={`admin-role-option ${!editIsAdmin ? 'active' : ''}`}
                                    onClick={() => setEditIsAdmin(false)}
                                    disabled={saving || (me?.id === editingUser.id)}
                                >
                                    Utilisateur simple
                                </button>
                                <button
                                    type="button"
                                    className={`admin-role-option ${editIsAdmin ? 'active' : ''}`}
                                    onClick={() => setEditIsAdmin(true)}
                                    disabled={saving || (me?.id === editingUser.id)}
                                >
                                    Administrateur
                                </button>
                            </div>
                            {me?.id === editingUser.id && (
                                <p className="admin-modal-hint">
                                    Vous ne pouvez pas modifier votre propre role.
                                </p>
                            )}
                            <input
                                className="admin-input"
                                type="text"
                                placeholder="Nom"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                required
                                autoFocus
                            />
                            <input
                                className="admin-input"
                                type="email"
                                placeholder="Email"
                                value={editEmail}
                                onChange={(e) => setEditEmail(e.target.value)}
                                required
                            />
                            <label className="admin-checkbox">
                                <input
                                    type="checkbox"
                                    checked={editEmailVerified}
                                    onChange={(e) => setEditEmailVerified(e.target.checked)}
                                />
                                <span>Email verifie</span>
                            </label>
                            <div className="admin-modal-actions">
                                <button
                                    type="button"
                                    className="admin-action"
                                    onClick={closeEdit}
                                    disabled={saving}
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="admin-cta admin-cta-primary"
                                    disabled={saving}
                                >
                                    {saving ? 'Sauvegarde...' : 'Enregistrer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {codeOpen && (
                <div className="admin-modal-backdrop" onClick={closeRotate}>
                    <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="admin-modal-header">
                            <h2 className="admin-modal-title">Rotation du code admin</h2>
                            <button
                                className="admin-modal-close"
                                onClick={closeRotate}
                                disabled={rotating}
                                aria-label="Fermer"
                            >
                                ×
                            </button>
                        </div>
                        <form onSubmit={handleRotateCode} className="admin-modal-form">
                            <p className="admin-modal-hint">
                                Le nouveau code remplacera l'ancien immediatement.
                                Communiquez-le aux personnes habilitees.
                            </p>
                            <input
                                className="admin-input"
                                type="text"
                                placeholder="Nouveau code (min. 8 caracteres)"
                                value={newCode}
                                onChange={(e) => setNewCode(e.target.value)}
                                required
                                minLength={8}
                                autoFocus
                                autoComplete="off"
                            />
                            <div className="admin-modal-actions">
                                <button
                                    type="button"
                                    className="admin-action"
                                    onClick={closeRotate}
                                    disabled={rotating}
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="admin-cta admin-cta-primary"
                                    disabled={rotating}
                                >
                                    {rotating ? 'Rotation...' : 'Appliquer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminDashboardPage;
