import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { getMe, logout, removeToken, getToken } from '../services/authService';
import { getAudios, createAudio, deleteAudio, getAudio } from '../services/audioService';
import { getInvoices, createInvoice, payInvoice, deleteInvoice } from '../services/billingService';
import {
    listMessages,
    getUnreadCount,
    sendMessage,
    getMessage,
    markMessageRead,
    deleteMessage,
    listContacts,
} from '../services/messageService';
import './DashboardPage.css';

// ───── Tarification a l usage ─────
const USAGE_RATE_PER_MIN = 0.10;   // 0.10 EUR HT par minute
const USAGE_VAT_RATE = 20;         // 20%
const USAGE_STORAGE_KEY = 'moustass:usage';

const readFileAsDataURL = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Lecture du fichier impossible'));
    reader.readAsDataURL(file);
});

const getAudioFileDuration = (file) => new Promise((resolve, reject) => {
    const audio = new Audio();
    const url = URL.createObjectURL(file);
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve(audio.duration || 0);
    };
    audio.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Metadonnees illisibles'));
    };
    audio.src = url;
});

const extFromDataUrl = (url) => {
    const m = /^data:audio\/([^;]+)/.exec(url || '');
    if (!m) return 'mp3';
    const map = { mpeg: 'mp3', 'x-wav': 'wav', wav: 'wav', ogg: 'ogg', webm: 'webm', mp4: 'mp4', aac: 'aac', flac: 'flac' };
    const sub = m[1].toLowerCase();
    return map[sub] || sub.replace(/\W/g, '') || 'mp3';
};

/**
 * Page principale du tableau de bord.
 *
 * Affiche :
 * - Profil utilisateur
 * - Enregistrements audio
 * - Factures
 *
 * @author Nirina
 * @version 1.0
 */
function DashboardPage() {
    const [user, setUser] = useState(null);
    const [activeTab, setActiveTab] = useState('profile');
    const [audios, setAudios] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Formulaire audio
    const [audioTitle, setAudioTitle] = useState('');
    const [audioFile, setAudioFile] = useState(null);
    const [audioFileName, setAudioFileName] = useState('');
    const [audioDuration, setAudioDuration] = useState('');
    const [uploading, setUploading] = useState(false);
    const audioFileInputRef = useRef(null);
    const [audioSearch, setAudioSearch] = useState('');
    const [draggingFile, setDraggingFile] = useState(false);
    const [playingId, setPlayingId] = useState(null);
    const [playingSrc, setPlayingSrc] = useState(null);
    const [playLoading, setPlayLoading] = useState(false);
    const playerRef = useRef(null);

    // Tracker temps passe sur la plateforme (en secondes)
    const [usageSeconds, setUsageSeconds] = useState(() => {
        const stored = parseInt(localStorage.getItem(USAGE_STORAGE_KEY) || '0', 10);
        return Number.isFinite(stored) ? stored : 0;
    });
    const [emittingInvoice, setEmittingInvoice] = useState(false);
    const [viewingInvoice, setViewingInvoice] = useState(null);

    // Messages
    const [messageBox, setMessageBox] = useState('inbox');
    const [messages, setMessages] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [composeOpen, setComposeOpen] = useState(false);
    const [composeReceiver, setComposeReceiver] = useState('');
    const [composeTitle, setComposeTitle] = useState('');
    const [composeFile, setComposeFile] = useState(null);
    const [composeFileName, setComposeFileName] = useState('');
    const [composeDuration, setComposeDuration] = useState(0);
    const [sendingMessage, setSendingMessage] = useState(false);
    const composeFileRef = useRef(null);
    const [playingMsgId, setPlayingMsgId] = useState(null);
    const [playingMsgSrc, setPlayingMsgSrc] = useState(null);
    const msgPlayerRef = useRef(null);
    const [toast, setToast] = useState(null);
    const toastTimerRef = useRef(null);
    const lastUnreadRef = useRef(0);

    const navigate = useNavigate();

    useEffect(() => {
        const token = getToken();
        if (!token) {
            navigate('/login');
            return;
        }
        loadUser();
    }, []);

    useEffect(() => {
        if (activeTab === 'audio') loadAudios();
        if (activeTab === 'billing') loadInvoices();
        if (activeTab === 'messages') {
            loadMessages();
            loadContacts();
        }
    }, [activeTab, messageBox]);

    // Polling unread count toutes les 15s + toast si nouveau
    useEffect(() => {
        let cancelled = false;
        const tick = async () => {
            try {
                const c = await getUnreadCount();
                if (cancelled) return;
                setUnreadCount(c);
                if (c > lastUnreadRef.current && lastUnreadRef.current >= 0) {
                    showToast(`${c - lastUnreadRef.current} nouveau${c - lastUnreadRef.current > 1 ? 'x' : ''} message${c - lastUnreadRef.current > 1 ? 's' : ''} audio`);
                }
                lastUnreadRef.current = c;
            } catch {
                // silencieux
            }
        };
        // premier tick avec retard pour eviter le toast au login
        const initial = setTimeout(async () => {
            try {
                const c = await getUnreadCount();
                if (!cancelled) {
                    setUnreadCount(c);
                    lastUnreadRef.current = c;
                }
            } catch {
                // silencieux
            }
        }, 800);
        const id = setInterval(tick, 15000);
        return () => {
            cancelled = true;
            clearTimeout(initial);
            clearInterval(id);
        };
    }, []);

    const showToast = (text) => {
        setToast(text);
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => setToast(null), 4500);
    };

    const loadMessages = async () => {
        try {
            const data = await listMessages(messageBox);
            setMessages(Array.isArray(data) ? data : []);
        } catch {
            setError('Erreur lors du chargement des messages.');
        }
    };

    const loadContacts = async () => {
        try {
            const data = await listContacts();
            setContacts(data);
        } catch {
            // ignore
        }
    };

    const openCompose = () => {
        setComposeReceiver('');
        setComposeTitle('');
        setComposeFile(null);
        setComposeFileName('');
        setComposeDuration(0);
        setComposeOpen(true);
    };

    const closeCompose = () => {
        if (sendingMessage) return;
        setComposeOpen(false);
    };

    const handleComposeFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setComposeFile(file);
        setComposeFileName(file.name);
        if (!composeTitle) setComposeTitle(file.name.replace(/\.[^.]+$/, ''));
        try {
            const seconds = await getAudioFileDuration(file);
            setComposeDuration(Math.round(seconds));
        } catch {
            // ignore
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!composeReceiver) {
            showToast('Choisissez un destinataire.');
            return;
        }
        if (!composeFile) {
            showToast('Selectionnez un fichier audio.');
            return;
        }
        setSendingMessage(true);
        try {
            const dataUrl = await readFileAsDataURL(composeFile);
            await sendMessage({
                receiverId: parseInt(composeReceiver, 10),
                title: composeTitle || 'Message audio',
                data: dataUrl,
                duration: composeDuration,
            });
            setComposeOpen(false);
            showToast('Message envoye.');
            if (messageBox === 'sent') loadMessages();
        } catch {
            showToast('Erreur lors de l envoi.');
        } finally {
            setSendingMessage(false);
        }
    };

    const handlePlayMessage = async (msg) => {
        if (playingMsgId === msg.id) {
            const el = msgPlayerRef.current;
            if (el) { if (el.paused) el.play(); else el.pause(); }
            return;
        }
        try {
            const data = await getMessage(msg.id);
            setPlayingMsgSrc(data?.data || null);
            setPlayingMsgId(msg.id);
            // refresh count car la lecture marque comme lu cote backend
            try {
                const c = await getUnreadCount();
                setUnreadCount(c);
                lastUnreadRef.current = c;
            } catch { /* ignore */ }
            if (messageBox === 'inbox') loadMessages();
            setTimeout(() => msgPlayerRef.current?.play().catch(() => {}), 50);
        } catch {
            showToast('Lecture impossible.');
        }
    };

    const handleClosePlayMessage = () => {
        if (msgPlayerRef.current) msgPlayerRef.current.pause();
        setPlayingMsgId(null);
        setPlayingMsgSrc(null);
    };

    const handleDeleteMessage = async (id) => {
        if (!window.confirm('Supprimer ce message ?')) return;
        try {
            await deleteMessage(id);
            loadMessages();
            showToast('Message supprime.');
        } catch {
            showToast('Erreur lors de la suppression.');
        }
    };

    const handleMarkRead = async (id) => {
        try {
            await markMessageRead(id);
            loadMessages();
            const c = await getUnreadCount();
            setUnreadCount(c);
            lastUnreadRef.current = c;
        } catch {
            // ignore
        }
    };

    const contactName = (id) => contacts.find((c) => c.id === id)?.name || `Utilisateur #${id}`;

    const loadUser = async () => {
        try {
            const data = await getMe(getToken());
            if (data.error) {
                navigate('/login');
            } else {
                setUser(data);
            }
        } catch {
            navigate('/login');
        }
    };

    const loadAudios = async () => {
        try {
            const data = await getAudios();
            setAudios(Array.isArray(data) ? data : []);
        } catch {
            setError('Erreur lors du chargement des audios.');
        }
    };

    const loadInvoices = async () => {
        try {
            const data = await getInvoices();
            setInvoices(Array.isArray(data) ? data : []);
        } catch {
            setError('Erreur lors du chargement des factures.');
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

    const handleAudioFileChange = async (e) => {
        const file = e.target.files?.[0] || null;
        await acceptAudioFile(file);
    };

    const acceptAudioFile = async (file) => {
        if (!file) return;
        if (!file.type.startsWith('audio/') && !/\.(mp3|wav|ogg|webm|m4a|flac|aac)$/i.test(file.name)) {
            setError('Format non supporte. Choisissez un fichier audio.');
            return;
        }
        setError('');
        setAudioFile(file);
        setAudioFileName(file.name);
        if (!audioTitle) setAudioTitle(file.name.replace(/\.[^.]+$/, ''));
        try {
            const seconds = await getAudioFileDuration(file);
            setAudioDuration(String(Math.round(seconds)));
        } catch {
            // si la duree ne peut pas etre extraite, on laisse vide
        }
    };

    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer?.types?.includes('Files')) setDraggingFile(true);
    };
    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.currentTarget === e.target) setDraggingFile(false);
    };
    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };
    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDraggingFile(false);
        const file = e.dataTransfer?.files?.[0];
        if (file) acceptAudioFile(file);
    };

    const handleResetUpload = () => {
        setAudioFile(null);
        setAudioFileName('');
        setAudioDuration('');
        if (audioFileInputRef.current) audioFileInputRef.current.value = '';
    };

    const handleCreateAudio = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        if (!audioFile) {
            setError('Veuillez selectionner un fichier audio.');
            return;
        }
        setUploading(true);
        try {
            const dataUrl = await readFileAsDataURL(audioFile);
            await createAudio(audioTitle, dataUrl, parseInt(audioDuration) || 0);
            setSuccess('Audio televerse avec succes.');
            setAudioTitle('');
            setAudioFile(null);
            setAudioFileName('');
            setAudioDuration('');
            if (audioFileInputRef.current) audioFileInputRef.current.value = '';
            loadAudios();
        } catch {
            setError('Erreur lors du televersement.');
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteAudio = async (id) => {
        try {
            await deleteAudio(id);
            setSuccess('Audio supprime.');
            loadAudios();
        } catch {
            setError('Erreur lors de la suppression.');
        }
    };

    const handlePlayAudio = async (audio) => {
        if (playingId === audio.id) {
            // toggle pause/play
            const el = playerRef.current;
            if (el) {
                if (el.paused) el.play();
                else el.pause();
            }
            return;
        }
        setPlayLoading(true);
        try {
            const data = await getAudio(audio.id);
            const dataUrl = data?.data;
            if (!dataUrl) {
                setError('Lecture impossible.');
                return;
            }
            setPlayingSrc(dataUrl);
            setPlayingId(audio.id);
            setTimeout(() => playerRef.current?.play().catch(() => {}), 50);
        } catch {
            setError('Erreur lors de la lecture.');
        } finally {
            setPlayLoading(false);
        }
    };

    const handleClosePlayer = () => {
        if (playerRef.current) playerRef.current.pause();
        setPlayingId(null);
        setPlayingSrc(null);
    };

    const fmtDuration = (sec) => {
        const s = Math.max(0, parseInt(sec, 10) || 0);
        const m = Math.floor(s / 60);
        const r = s % 60;
        return `${m}:${String(r).padStart(2, '0')}`;
    };

    const filteredAudios = audios.filter((a) => {
        const q = audioSearch.trim().toLowerCase();
        if (!q) return true;
        return (a.title || '').toLowerCase().includes(q);
    });

    const audioStats = {
        count: audios.length,
        totalSeconds: audios.reduce((acc, a) => acc + (parseInt(a.duration, 10) || 0), 0),
    };

    const audioCoverGradient = (id) => {
        const palettes = [
            'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
            'linear-gradient(135deg, #06b6d4 0%, #6366f1 100%)',
            'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
            'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
            'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
        ];
        return palettes[(id || 0) % palettes.length];
    };

    const handleDownloadAudio = async (audio) => {
        try {
            const data = await getAudio(audio.id);
            const dataUrl = data?.data;
            if (!dataUrl || typeof dataUrl !== 'string') {
                setError('Contenu audio introuvable.');
                return;
            }
            const a = document.createElement('a');
            a.href = dataUrl;
            const safeTitle = (audio.title || `audio-${audio.id}`).replace(/[^a-z0-9-_]+/gi, '_');
            a.download = `${safeTitle}.${extFromDataUrl(dataUrl)}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setSuccess('Telechargement demarre.');
        } catch {
            setError('Erreur lors du telechargement.');
        }
    };

    // ───── Tracker temps live ─────
    useEffect(() => {
        const interval = setInterval(() => {
            if (!document.hidden) {
                setUsageSeconds((s) => {
                    const next = s + 1;
                    localStorage.setItem(USAGE_STORAGE_KEY, String(next));
                    return next;
                });
            }
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const usageMinutes = Math.ceil(usageSeconds / 60);
    const usageHt = usageMinutes * USAGE_RATE_PER_MIN;
    const usageTva = usageHt * (USAGE_VAT_RATE / 100);
    const usageTtc = usageHt + usageTva;

    const handleEmitUsageInvoice = async () => {
        if (usageMinutes < 1) {
            setError('Aucune utilisation a facturer pour le moment.');
            return;
        }
        setError('');
        setSuccess('');
        setEmittingInvoice(true);
        try {
            const item = {
                description: 'Utilisation plateforme Moustass CloudSec',
                quantity: usageMinutes,
                unit: 'min',
                unit_price: USAGE_RATE_PER_MIN,
                vat_rate: USAGE_VAT_RATE,
            };
            const result = await createInvoice({
                customer_name: user?.name || '',
                customer_email: user?.email || '',
                reference: `USAGE-${new Date().toISOString().slice(0, 10)}`,
                due_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
                payment_terms: 'Le paiement est du dans 30 jours',
                vat_rate: USAGE_VAT_RATE,
                items: [item],
                description: `Utilisation : ${usageMinutes} min × ${USAGE_RATE_PER_MIN.toFixed(2)} EUR`,
            });
            // Reset compteur apres emission
            setUsageSeconds(0);
            localStorage.setItem(USAGE_STORAGE_KEY, '0');
            setSuccess(`Facture ${result?.invoice?.invoice_number || ''} emise. Generation du PDF...`);
            await loadInvoices();
            // Auto-ouverture du PDF apres petit delai pour laisser le rendu se faire
            if (result?.invoice) {
                setTimeout(() => generateInvoicePdf(result.invoice), 300);
            }
        } catch (err) {
            setError(err?.response?.data?.error || 'Erreur lors de l’emission de la facture.');
        } finally {
            setEmittingInvoice(false);
        }
    };

    const generateInvoicePdf = async (invoice) => {
        // Rendu hors-ecran avec InvoiceView
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.left = '-10000px';
        container.style.top = '0';
        container.style.width = '880px';
        container.style.background = '#ffffff';
        document.body.appendChild(container);

        const { createRoot } = await import('react-dom/client');
        const root = createRoot(container);
        await new Promise((resolve) => {
            root.render(<InvoiceView invoice={invoice} pdfMode onMounted={resolve} />);
        });
        // Attendre un tick pour le DOM
        await new Promise((r) => setTimeout(r, 80));

        const doc = container.querySelector('.invoice-doc');
        try {
            const canvas = await html2canvas(doc, {
                scale: 2,
                backgroundColor: '#ffffff',
                useCORS: true,
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
            const pageWidth = pdf.internal.pageSize.getWidth();
            const ratio = pageWidth / canvas.width;
            const imgHeight = canvas.height * ratio;
            pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, imgHeight);
            const filename = `${invoice.invoice_number || `facture-${invoice.id}`}.pdf`;
            pdf.save(filename);
        } finally {
            root.unmount();
            container.remove();
        }
    };

    const handlePayInvoice = async (id) => {
        try {
            await payInvoice(id);
            setSuccess('Facture payee avec succes.');
            loadInvoices();
        } catch {
            setError('Erreur lors du paiement.');
        }
    };

    const handleDeleteInvoice = async (id) => {
        try {
            await deleteInvoice(id);
            setSuccess('Facture supprimee.');
            loadInvoices();
        } catch {
            setError('Erreur lors de la suppression.');
        }
    };

    const getStatusClass = (status) => {
        if (status === 'paid') return 'dashboard-status-paid';
        if (status === 'cancelled') return 'dashboard-status-cancelled';
        return 'dashboard-status-pending';
    };

    const tabs = [
        { id: 'profile', label: 'Profil' },
        { id: 'audio', label: 'Audios' },
        { id: 'messages', label: 'Messages' },
        { id: 'billing', label: 'Factures' },
    ];

    const tabTitle = {
        profile: 'Mon profil',
        audio: 'Enregistrements audio',
        messages: 'Messagerie audio',
        billing: 'Mes factures',
    };

    const tabSubtitle = {
        profile: 'Vos informations personnelles et statut du compte.',
        audio: 'Enregistrements chiffrés AES-256 + empreinte SHA-256.',
        messages: 'Envoyez et recevez des messages audio chiffrés.',
        billing: 'Factures et paiements liés à votre compte.',
    };

    return (
        <div className="admin-shell">
            <aside className="admin-sidebar">
                <div className="admin-brand">
                    <span className="admin-brand-dot" />
                    <span>Moustass CloudSec</span>
                </div>
                <nav className="admin-nav">
                    {tabs.map((t) => (
                        <button
                            key={t.id}
                            className={`admin-nav-item ${activeTab === t.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(t.id)}
                        >
                            <span className="admin-nav-icon">{t.label[0]}</span>
                            <span className="admin-nav-text">{t.label}</span>
                            {t.id === 'messages' && unreadCount > 0 && (
                                <span className="nav-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                            )}
                        </button>
                    ))}
                    {user?.isAdmin && (
                        <button
                            className="admin-nav-item"
                            onClick={() => navigate('/admin')}
                        >
                            <span className="admin-nav-icon">A</span>
                            Administration
                        </button>
                    )}
                </nav>
                <div className="admin-sidebar-footer">
                    <div className="admin-user-card">
                        <div className="admin-avatar">
                            {user?.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="admin-user-meta">
                            <span className="admin-user-name">{user?.name}</span>
                            <span className="admin-user-role">
                                {user?.isAdmin ? 'Administrateur' : 'Utilisateur'}
                            </span>
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
                        <h1 className="admin-title">{tabTitle[activeTab]}</h1>
                        <p className="admin-subtitle">{tabSubtitle[activeTab]}</p>
                    </div>
                </header>

                {error && <div className="dashboard-error">{error}</div>}
                {success && <div className="dashboard-success">{success}</div>}

                {activeTab === 'profile' && user && (
                    <div className="dashboard-section">
                        <h2 className="dashboard-section-title">Informations du compte</h2>
                        <div className="dashboard-profile">
                            <div className="dashboard-profile-item">
                                <span className="dashboard-profile-label">Nom</span>
                                <span className="dashboard-profile-value">{user.name}</span>
                            </div>
                            <div className="dashboard-profile-item">
                                <span className="dashboard-profile-label">Email</span>
                                <span className="dashboard-profile-value">{user.email}</span>
                            </div>
                            <div className="dashboard-profile-item">
                                <span className="dashboard-profile-label">Email verifie</span>
                                <span className="dashboard-profile-value">
                                    {user.emailVerified ? 'Oui' : 'Non'}
                                </span>
                            </div>
                            <div className="dashboard-profile-item">
                                <span className="dashboard-profile-label">Role</span>
                                <span className="dashboard-profile-value">
                                    {user.isAdmin ? 'Administrateur' : 'Utilisateur'}
                                </span>
                            </div>
                            <div className="dashboard-profile-item">
                                <span className="dashboard-profile-label">Membre depuis</span>
                                <span className="dashboard-profile-value">
                                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'audio' && (
                    <div className="audio-tab">
                        <div className="audio-stats-row">
                            <div className="audio-stat-pill">
                                <span className="audio-stat-icon">♪</span>
                                <div>
                                    <strong>{audioStats.count}</strong>
                                    <span>{audioStats.count > 1 ? 'enregistrements' : 'enregistrement'}</span>
                                </div>
                            </div>
                            <div className="audio-stat-pill">
                                <span className="audio-stat-icon">⏱</span>
                                <div>
                                    <strong>{fmtDuration(audioStats.totalSeconds)}</strong>
                                    <span>durée totale</span>
                                </div>
                            </div>
                            <input
                                type="search"
                                className="audio-search"
                                placeholder="Rechercher un enregistrement..."
                                value={audioSearch}
                                onChange={(e) => setAudioSearch(e.target.value)}
                            />
                        </div>

                        <form onSubmit={handleCreateAudio} className="audio-upload-form">
                            <div
                                className={`audio-dropzone ${draggingFile ? 'is-dragging' : ''} ${audioFile ? 'has-file' : ''}`}
                                onDragEnter={handleDragEnter}
                                onDragLeave={handleDragLeave}
                                onDragOver={handleDragOver}
                                onDrop={handleDrop}
                                onClick={() => !audioFile && audioFileInputRef.current?.click()}
                                role="button"
                                tabIndex={0}
                            >
                                <input
                                    ref={audioFileInputRef}
                                    type="file"
                                    accept="audio/*"
                                    onChange={handleAudioFileChange}
                                    style={{ display: 'none' }}
                                />
                                {!audioFile ? (
                                    <>
                                        <div className="audio-dropzone-icon">⤓</div>
                                        <p className="audio-dropzone-title">
                                            {draggingFile ? 'Lachez le fichier ici' : 'Glissez un fichier audio ou cliquez'}
                                        </p>
                                        <p className="audio-dropzone-hint">mp3, wav, ogg, webm, m4a, flac, aac</p>
                                    </>
                                ) : (
                                    <div className="audio-dropzone-preview">
                                        <div className="audio-dropzone-cover" style={{ background: audioCoverGradient(Date.now() % 6) }}>♪</div>
                                        <div className="audio-dropzone-meta">
                                            <strong>{audioFileName}</strong>
                                            <span>{audioDuration ? `${fmtDuration(audioDuration)}` : 'duree inconnue'}</span>
                                        </div>
                                        <button
                                            type="button"
                                            className="audio-dropzone-clear"
                                            onClick={(e) => { e.stopPropagation(); handleResetUpload(); }}
                                            aria-label="Retirer"
                                        >
                                            ×
                                        </button>
                                    </div>
                                )}
                            </div>

                            {audioFile && (
                                <div className="audio-upload-actions">
                                    <input
                                        className="audio-title-input"
                                        type="text"
                                        placeholder="Titre de l'enregistrement"
                                        value={audioTitle}
                                        onChange={(e) => setAudioTitle(e.target.value)}
                                        required
                                    />
                                    <button
                                        className="dashboard-button"
                                        type="submit"
                                        disabled={uploading || !audioFile}
                                    >
                                        {uploading ? 'Televersement...' : 'Televerser'}
                                    </button>
                                </div>
                            )}
                        </form>

                        {filteredAudios.length === 0 ? (
                            <div className="audio-empty">
                                <span className="audio-empty-icon">♪</span>
                                <p>{audios.length === 0 ? 'Aucun enregistrement pour le moment.' : 'Aucun resultat.'}</p>
                            </div>
                        ) : (
                            <div className="audio-grid">
                                {filteredAudios.map((audio) => {
                                    const isPlaying = playingId === audio.id;
                                    return (
                                        <div key={audio.id} className={`audio-card ${isPlaying ? 'is-playing' : ''}`}>
                                            <div
                                                className="audio-card-cover"
                                                style={{ background: audioCoverGradient(audio.id) }}
                                            >
                                                <button
                                                    className="audio-card-play"
                                                    onClick={() => handlePlayAudio(audio)}
                                                    disabled={playLoading && !isPlaying}
                                                    aria-label={isPlaying ? 'Pause' : 'Lecture'}
                                                >
                                                    {playLoading && !isPlaying ? '…' : isPlaying ? '❚❚' : '▶'}
                                                </button>
                                            </div>
                                            <div className="audio-card-body">
                                                <h3 className="audio-card-title" title={audio.title}>{audio.title}</h3>
                                                <p className="audio-card-meta">
                                                    <span>{fmtDuration(audio.duration)}</span>
                                                    <span className="audio-card-sep">·</span>
                                                    <span className="audio-card-hash" title={audio.sha256_hash}>
                                                        SHA {(audio.sha256_hash || '').substring(0, 8)}
                                                    </span>
                                                </p>
                                                <div className="audio-card-actions">
                                                    <button
                                                        className="audio-card-action"
                                                        onClick={() => handleDownloadAudio(audio)}
                                                        title="Telecharger"
                                                    >
                                                        ⤓
                                                    </button>
                                                    <button
                                                        className="audio-card-action audio-card-action-danger"
                                                        onClick={() => handleDeleteAudio(audio.id)}
                                                        title="Supprimer"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {playingSrc && (
                            <div className="audio-player-bar">
                                <div className="audio-player-info">
                                    <span className="audio-player-cover" style={{ background: audioCoverGradient(playingId) }}>♪</span>
                                    <span className="audio-player-title">
                                        {audios.find((a) => a.id === playingId)?.title || 'En lecture'}
                                    </span>
                                </div>
                                <audio
                                    ref={playerRef}
                                    src={playingSrc}
                                    controls
                                    className="audio-player-element"
                                    onEnded={handleClosePlayer}
                                />
                                <button
                                    className="audio-player-close"
                                    onClick={handleClosePlayer}
                                    aria-label="Fermer le lecteur"
                                >
                                    ×
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'messages' && (
                    <div className="messages-tab">
                        <div className="messages-toolbar">
                            <div className="messages-tabs">
                                <button
                                    className={`messages-tab ${messageBox === 'inbox' ? 'active' : ''}`}
                                    onClick={() => setMessageBox('inbox')}
                                >
                                    Reçus
                                    {unreadCount > 0 && <span className="messages-tab-badge">{unreadCount}</span>}
                                </button>
                                <button
                                    className={`messages-tab ${messageBox === 'sent' ? 'active' : ''}`}
                                    onClick={() => setMessageBox('sent')}
                                >
                                    Envoyés
                                </button>
                            </div>
                            <button className="dashboard-button" onClick={openCompose}>
                                + Nouveau message
                            </button>
                        </div>

                        {messages.length === 0 ? (
                            <div className="audio-empty">
                                <span className="audio-empty-icon">✉</span>
                                <p>{messageBox === 'inbox' ? 'Aucun message reçu.' : 'Aucun message envoyé.'}</p>
                            </div>
                        ) : (
                            <div className="messages-list">
                                {messages.map((m) => {
                                    const isPlaying = playingMsgId === m.id;
                                    const isUnread = messageBox === 'inbox' && !m.is_read;
                                    const otherId = messageBox === 'inbox' ? m.sender_id : m.receiver_id;
                                    return (
                                        <div
                                            key={m.id}
                                            className={`message-item ${isUnread ? 'is-unread' : ''} ${isPlaying ? 'is-playing' : ''}`}
                                        >
                                            <div
                                                className="message-avatar"
                                                style={{ background: audioCoverGradient(otherId) }}
                                            >
                                                {(contactName(otherId)[0] || '?').toUpperCase()}
                                            </div>
                                            <div className="message-body">
                                                <div className="message-header">
                                                    <span className="message-name">
                                                        {messageBox === 'inbox' ? 'De ' : 'À '}
                                                        <strong>{contactName(otherId)}</strong>
                                                    </span>
                                                    {isUnread && <span className="message-dot" />}
                                                    <span className="message-date">
                                                        {new Date(m.created_at).toLocaleString('fr-FR', {
                                                            dateStyle: 'short',
                                                            timeStyle: 'short',
                                                        })}
                                                    </span>
                                                </div>
                                                <div className="message-title">{m.title || 'Message audio'}</div>
                                                <div className="message-meta">
                                                    {fmtDuration(m.duration)} ·
                                                    <span className="audio-card-hash">SHA {(m.audio_hash || '').slice(0, 8)}</span>
                                                </div>
                                            </div>
                                            <div className="message-actions">
                                                <button
                                                    className="message-action message-action-play"
                                                    onClick={() => handlePlayMessage(m)}
                                                    title="Lire"
                                                >
                                                    {isPlaying ? '❚❚' : '▶'}
                                                </button>
                                                {isUnread && (
                                                    <button
                                                        className="audio-card-action"
                                                        onClick={() => handleMarkRead(m.id)}
                                                        title="Marquer comme lu"
                                                    >
                                                        ✓
                                                    </button>
                                                )}
                                                <button
                                                    className="audio-card-action audio-card-action-danger"
                                                    onClick={() => handleDeleteMessage(m.id)}
                                                    title="Supprimer"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {playingMsgSrc && (
                            <div className="audio-player-bar">
                                <div className="audio-player-info">
                                    <span
                                        className="audio-player-cover"
                                        style={{ background: audioCoverGradient(playingMsgId) }}
                                    >✉</span>
                                    <span className="audio-player-title">
                                        {messages.find((m) => m.id === playingMsgId)?.title || 'En lecture'}
                                    </span>
                                </div>
                                <audio
                                    ref={msgPlayerRef}
                                    src={playingMsgSrc}
                                    controls
                                    className="audio-player-element"
                                    onEnded={handleClosePlayMessage}
                                />
                                <button
                                    className="audio-player-close"
                                    onClick={handleClosePlayMessage}
                                    aria-label="Fermer le lecteur"
                                >
                                    ×
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'billing' && (
                    <div className="dashboard-section">
                        <h2 className="dashboard-section-title">Mon compteur d'usage</h2>

                        <div className="usage-card">
                            <div className="usage-meter">
                                <div className="usage-meter-time">
                                    {String(Math.floor(usageSeconds / 3600)).padStart(2, '0')}
                                    :{String(Math.floor((usageSeconds % 3600) / 60)).padStart(2, '0')}
                                    :{String(usageSeconds % 60).padStart(2, '0')}
                                </div>
                                <div className="usage-meter-label">Temps connecte</div>
                            </div>
                            <div className="usage-stats">
                                <div><span>Minutes facturables</span><strong>{usageMinutes} min</strong></div>
                                <div><span>Tarif</span><strong>{USAGE_RATE_PER_MIN.toFixed(2)} € HT / min</strong></div>
                                <div><span>Total HT</span><strong>{usageHt.toFixed(2)} €</strong></div>
                                <div><span>TVA {USAGE_VAT_RATE}%</span><strong>{usageTva.toFixed(2)} €</strong></div>
                                <div className="usage-stats-grand"><span>Total TTC</span><strong>{usageTtc.toFixed(2)} €</strong></div>
                            </div>
                            <button
                                className="dashboard-button usage-emit"
                                onClick={handleEmitUsageInvoice}
                                disabled={emittingInvoice || usageMinutes < 1}
                            >
                                {emittingInvoice ? 'Emission...' : 'Emettre ma facture (PDF)'}
                            </button>
                        </div>

                        <h2 className="dashboard-section-title" style={{ marginTop: 36 }}>Mes factures</h2>
                        <div className="dashboard-list">
                            {invoices.length === 0 ? (
                                <p className="dashboard-empty">Aucune facture emise.</p>
                            ) : (
                                invoices.map((invoice) => (
                                    <div key={invoice.id} className="dashboard-item">
                                        <div>
                                            <p className="dashboard-item-title">
                                                {invoice.invoice_number || `Facture #${invoice.id}`}
                                            </p>
                                            <p className="dashboard-item-detail">
                                                {invoice.reference || '—'} ·
                                                {' '}{Number(invoice.amount || 0).toFixed(2)} € HT
                                                {invoice.vat_rate ? ` · TVA ${invoice.vat_rate}%` : ''}
                                            </p>
                                            <p className={getStatusClass(invoice.status)}>
                                                {(invoice.status || '').toUpperCase()}
                                            </p>
                                        </div>
                                        <div className="dashboard-item-actions">
                                            <button
                                                className="dashboard-pay-button"
                                                onClick={() => setViewingInvoice(invoice)}
                                            >
                                                Voir
                                            </button>
                                            <button
                                                className="dashboard-pay-button"
                                                onClick={() => generateInvoicePdf(invoice)}
                                            >
                                                PDF
                                            </button>
                                            {invoice.status === 'pending' && (
                                                <button
                                                    className="dashboard-pay-button"
                                                    onClick={() => handlePayInvoice(invoice.id)}
                                                >
                                                    Payer
                                                </button>
                                            )}
                                            <button
                                                className="dashboard-delete-button"
                                                onClick={() => handleDeleteInvoice(invoice.id)}
                                            >
                                                Supprimer
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

            </main>

            {viewingInvoice && (
                <InvoiceView
                    invoice={viewingInvoice}
                    onClose={() => setViewingInvoice(null)}
                />
            )}

            {composeOpen && (
                <div className="admin-modal-backdrop" onClick={closeCompose}>
                    <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="admin-modal-header">
                            <h2 className="admin-modal-title">Nouveau message audio</h2>
                            <button
                                className="admin-modal-close"
                                onClick={closeCompose}
                                disabled={sendingMessage}
                                aria-label="Fermer"
                            >×</button>
                        </div>
                        <form onSubmit={handleSendMessage} className="admin-modal-form">
                            <select
                                className="admin-input"
                                value={composeReceiver}
                                onChange={(e) => setComposeReceiver(e.target.value)}
                                required
                            >
                                <option value="">Choisissez un destinataire...</option>
                                {contacts.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name} — {c.email}</option>
                                ))}
                            </select>
                            <input
                                className="admin-input"
                                type="text"
                                placeholder="Titre (optionnel)"
                                value={composeTitle}
                                onChange={(e) => setComposeTitle(e.target.value)}
                            />
                            <button
                                type="button"
                                className="audio-dropzone"
                                onClick={() => composeFileRef.current?.click()}
                                style={{ padding: composeFile ? '14px 18px' : '24px', cursor: 'pointer' }}
                            >
                                <input
                                    ref={composeFileRef}
                                    type="file"
                                    accept="audio/*"
                                    onChange={handleComposeFile}
                                    style={{ display: 'none' }}
                                />
                                {composeFile ? (
                                    <div className="audio-dropzone-preview" style={{ margin: 0 }}>
                                        <div className="audio-dropzone-cover" style={{ background: audioCoverGradient(Date.now() % 6) }}>♪</div>
                                        <div className="audio-dropzone-meta">
                                            <strong>{composeFileName}</strong>
                                            <span>{fmtDuration(composeDuration)}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="audio-dropzone-icon" style={{ width: 48, height: 48, fontSize: 22, marginBottom: 10 }}>⤓</div>
                                        <p className="audio-dropzone-title" style={{ fontSize: 14 }}>Choisir un fichier audio</p>
                                    </>
                                )}
                            </button>
                            <div className="admin-modal-actions">
                                <button
                                    type="button"
                                    className="admin-action"
                                    onClick={closeCompose}
                                    disabled={sendingMessage}
                                >Annuler</button>
                                <button
                                    type="submit"
                                    className="admin-cta admin-cta-primary"
                                    disabled={sendingMessage}
                                >
                                    {sendingMessage ? 'Envoi...' : 'Envoyer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {toast && (
                <div className="notif-toast" onClick={() => setToast(null)}>
                    <div className="notif-toast-icon">🔔</div>
                    <div className="notif-toast-body">
                        <strong>Notification</strong>
                        <span>{toast}</span>
                    </div>
                    <button
                        className="notif-toast-close"
                        onClick={(e) => { e.stopPropagation(); setToast(null); }}
                        aria-label="Fermer"
                    >×</button>
                </div>
            )}
        </div>
    );
}

function InvoiceView({ invoice, onClose, pdfMode = false, onMounted }) {
    useEffect(() => {
        if (onMounted) onMounted();
    }, []);

    const items = Array.isArray(invoice.items) ? invoice.items : [];
    const vatRate = parseFloat(invoice.vat_rate) || 20;
    const totals = items.length
        ? items.reduce(
              (acc, it) => {
                  const ht = (parseFloat(it.quantity) || 0) * (parseFloat(it.unit_price) || 0);
                  const tva = ht * ((parseFloat(it.vat_rate) || vatRate) / 100);
                  return { ht: acc.ht + ht, tva: acc.tva + tva };
              },
              { ht: 0, tva: 0 }
          )
        : { ht: parseFloat(invoice.amount) || 0, tva: (parseFloat(invoice.amount) || 0) * (vatRate / 100) };
    const ttc = totals.ht + totals.tva;

    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

    const handlePrint = () => window.print();

    const docNode = (
        <article className="invoice-doc">
            <header className="invoice-doc-header">
                <div className="invoice-doc-brand">
                    <span>Moustass CloudSec</span>
                </div>
                <div className="invoice-doc-meta">
                    <h1>Facture</h1>
                    <dl>
                        <dt>Numero de facture</dt><dd>{invoice.invoice_number || `#${invoice.id}`}</dd>
                        <dt>Date de facturation</dt><dd>{fmtDate(invoice.created_at)}</dd>
                        <dt>Echeance</dt><dd>{fmtDate(invoice.due_date)}</dd>
                        <dt>Reference</dt><dd>{invoice.reference || '—'}</dd>
                    </dl>
                </div>
            </header>

            <section className="invoice-doc-parties">
                <div>
                    <h3>Facturer a :</h3>
                    <p>{invoice.customer_name || '—'}</p>
                    {invoice.customer_address && <p style={{ whiteSpace: 'pre-line' }}>{invoice.customer_address}</p>}
                    {invoice.customer_phone && <p>{invoice.customer_phone}</p>}
                    {invoice.customer_email && <p>{invoice.customer_email}</p>}
                </div>
                <div>
                    <h3>Expedier a :</h3>
                    <p>{invoice.customer_name || '—'}</p>
                    {invoice.customer_address && <p style={{ whiteSpace: 'pre-line' }}>{invoice.customer_address}</p>}
                    {invoice.customer_phone && <p>{invoice.customer_phone}</p>}
                    {invoice.customer_email && <p>{invoice.customer_email}</p>}
                </div>
            </section>

            <table className="invoice-doc-items">
                <thead>
                    <tr>
                        <th>Description</th>
                        <th>Quantite</th>
                        <th>Unite</th>
                        <th>Prix unitaire HT</th>
                        <th>TVA %</th>
                        <th>Total TVA</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    {(items.length ? items : [{
                        description: invoice.description || 'Prestation',
                        quantity: 1,
                        unit: '',
                        unit_price: invoice.amount,
                        vat_rate: vatRate,
                    }]).map((it, idx) => {
                        const qty = parseFloat(it.quantity) || 0;
                        const price = parseFloat(it.unit_price) || 0;
                        const v = parseFloat(it.vat_rate ?? vatRate);
                        const ht = qty * price;
                        const tva = ht * (v / 100);
                        return (
                            <tr key={idx}>
                                <td>{it.description}</td>
                                <td>{qty}</td>
                                <td>{it.unit || ''}</td>
                                <td>{price.toFixed(2)} €</td>
                                <td>{v}%</td>
                                <td>{tva.toFixed(2)} €</td>
                                <td>{(ht + tva).toFixed(2)} €</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            <section className="invoice-doc-totals">
                <div><span>Montant HT</span><strong>{totals.ht.toFixed(2)} €</strong></div>
                <div><span>Total TVA</span><strong>{totals.tva.toFixed(2)} €</strong></div>
                <div className="invoice-doc-grand"><span>Total TTC</span><strong>{ttc.toFixed(2)} €</strong></div>
            </section>

            <section className="invoice-doc-payment">
                <h4>Conditions et modalites de paiement</h4>
                <p>{invoice.payment_terms || 'Le paiement est du dans 30 jours'}</p>
            </section>

            <section className="invoice-doc-bank">
                <h4>Details bancaires</h4>
                <p>Banque : Societe Generale</p>
                <p>IBAN : FR11 6954 8594 0236 23</p>
                <p>SWIFT/BIC : FRHHCXX2565</p>
            </section>

            <footer className="invoice-doc-footer">
                <p className="invoice-doc-thanks">Nous apprecions votre clientele.</p>
                <p>Si vous avez des questions sur cette facture, n'hesitez pas a nous contacter.</p>
                <div className="invoice-doc-legal">
                    Numero SIRET | Code APE | Numero TVA Intracommunautaire
                </div>
            </footer>
        </article>
    );

    if (pdfMode) {
        return docNode;
    }

    return (
        <div className="invoice-view-backdrop" onClick={onClose}>
            <div className="invoice-view-wrapper" onClick={(e) => e.stopPropagation()}>
                <div className="invoice-view-toolbar">
                    <button className="dashboard-pay-button" onClick={handlePrint}>Imprimer</button>
                    <button className="dashboard-delete-button" onClick={onClose}>Fermer</button>
                </div>
                {docNode}
            </div>
        </div>
    );
}

export default DashboardPage;