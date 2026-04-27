# 🎭 Moustass CloudSec

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![CI/CD](https://github.com/Nirina2108/moustass-cloudsec/actions/workflows/ci.yml/badge.svg)
![Java](https://img.shields.io/badge/Java-17-orange.svg)
![PHP](https://img.shields.io/badge/PHP-8.2-purple.svg)
![React](https://img.shields.io/badge/React-18-61DAFB.svg)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

**Application cloud sécurisée en microservices — Architecture Zero Trust**

*Barbichetz Ltd · Secteur Financier · Production Ready*

</div>

---

## 📋 Table des matières

- [Vue d'ensemble](#-vue-densemble)
- [Architecture](#-architecture)
- [Microservices](#-microservices)
- [Sécurité](#-sécurité)
- [Prérequis](#-prérequis)
- [Installation](#-installation)
- [Tests](#-tests)
- [CI/CD](#-cicd)
- [Variables d'environnement](#-variables-denvironnement)
- [Choix techniques](#-choix-techniques)

---

## 🌐 Vue d'ensemble

**Moustass CloudSec** est une application de messagerie vocale sécurisée développée pour **Barbichetz Ltd**, une entreprise du secteur financier. Face à une croissance internationale, l'application a été migrée vers une architecture cloud moderne basée sur des **microservices indépendants**, conforme aux standards **Zero Trust**.

### Fonctionnalités principales

- **Authentification forte** avec HMAC-SHA256, JWT et Master Key AES-256-GCM
- **Confirmation email** obligatoire à l'inscription
- **Paires de clés RSA** générées automatiquement par utilisateur
- **Enregistrements audio** chiffrés avec AES-256-CBC et hashés SHA-256
- **Gestion de facturation** avec suivi des statuts de paiement
- **Logs de transactions** pour toutes les actions sensibles
- **Architecture Zero Trust** — chaque requête est authentifiée et vérifiée

---

## 🏗️ Architecture
┌─────────────────────────────────────────────────────────┐
│                    Frontend React                        │
│                   localhost:3000                         │
└──────────────┬──────────────┬──────────────────────────┘
│              │              │
▼              ▼              ▼
┌─────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  Auth Service   │ │  Audio Service   │ │ Billing Service  │
│  Spring Boot    │ │    Laravel       │ │    Laravel       │
│  port: 8000     │ │  port: 8001      │ │  port: 8002      │
└────────┬────────┘ └───────┬──────────┘ └───────┬──────────┘
│                  │                     │
▼                  ▼                     ▼
┌─────────────┐    ┌─────────────────┐   ┌─────────────────┐
│   db_auth   │    │   db_audio      │   │   db_billing    │
│  MySQL 8.0  │    │   MySQL 8.0     │   │   MySQL 8.0     │
│  port: 3307 │    │   port: 3308    │   │   port: 3309    │
└─────────────┘    └─────────────────┘   └─────────────────┘

### Principe Zero Trust

- Chaque microservice possède sa **propre base de données isolée**
- Chaque requête API contient un **JWT Bearer token** vérifié
- Les services Laravel valident les tokens auprès de l'**Auth Service**
- Aucune communication directe entre services sans authentification

---

## 🔧 Microservices

### 1. Auth Service (Spring Boot)

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/auth/register` | POST | Inscription + envoi email confirmation |
| `/api/auth/verify-email` | GET | Activation du compte |
| `/api/auth/client-proof` | POST | Génération preuve HMAC |
| `/api/auth/login` | POST | Connexion sécurisée HMAC + JWT |
| `/api/auth/me` | GET | Profil utilisateur |
| `/api/auth/logout` | POST | Déconnexion |
| `/api/auth/change-password` | PUT | Changement de mot de passe |

### 2. Audio Service (Laravel)

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/audio` | GET | Liste des enregistrements |
| `/api/audio` | POST | Créer un enregistrement (chiffrement AES) |
| `/api/audio/{id}` | GET | Détails (déchiffrement AES) |
| `/api/audio/{id}` | PUT | Modifier un enregistrement |
| `/api/audio/{id}` | DELETE | Supprimer un enregistrement |

### 3. Billing Service (Laravel)

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/invoices` | GET | Liste des factures |
| `/api/invoices` | POST | Créer une facture |
| `/api/invoices/{id}` | GET | Détails d'une facture |
| `/api/invoices/{id}` | PUT | Modifier une facture |
| `/api/invoices/{id}` | DELETE | Supprimer une facture |
| `/api/invoices/{id}/pay` | PUT | Payer une facture |

---

## 🔐 Sécurité

### Authentification HMAC
Client                          Server
│                               │
│── POST /client-proof ────────►│
│◄─ {nonce, timestamp, hmac} ──│
│                               │
│── POST /login ───────────────►│
│   {email, nonce, timestamp,   │
│    hmac}                      │
│◄─ {accessToken (JWT)} ───────│

### Cryptographie

| Composant | Algorithme | Usage |
|-----------|-----------|-------|
| Mots de passe | AES-256-GCM | Chiffrement réversible (protocole HMAC) |
| Authentification | HMAC-SHA256 | Signature des requêtes de login |
| Sessions | JWT HS256 | Tokens d'accès (15 minutes) |
| Audio | AES-256-CBC | Chiffrement des enregistrements |
| Intégrité | SHA-256 | Hash des fichiers audio |
| Clés utilisateur | RSA-2048 | Paire de clés par utilisateur |

### Politique de mots de passe

- Minimum **12 caractères**
- Au moins **1 majuscule**
- Au moins **1 minuscule**
- Au moins **1 chiffre**
- Au moins **1 caractère spécial** (`!@#$%^&*()`)

---

## ✅ Prérequis

| Outil | Version minimale |
|-------|-----------------|
| Docker | 24.0+ |
| Docker Compose | 2.0+ |
| Java | 17 (développement) |
| PHP | 8.2 (développement) |
| Node.js | 20.0 (développement) |

---

## 🚀 Installation

### Production (Docker)
```bash
# Cloner le projet
git clone https://github.com/Nirina2108/moustass-cloudsec.git
cd moustass-cloudsec

# Lancer tous les services
docker compose up --build

# L'application est accessible sur :
# Frontend  → http://localhost:3000
# Auth API  → http://localhost:8000
# Audio API → http://localhost:8001
# Billing   → http://localhost:8002
```

### Développement local

#### Auth Service
```bash
cd backend
./mvnw spring-boot:run
```

#### Audio Service
```bash
cd audio-service
composer install
php artisan key:generate
php artisan migrate
php artisan serve --port=8001
```

#### Billing Service
```bash
cd billing-service
composer install
php artisan key:generate
php artisan migrate
php artisan serve --port=8002
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
# Accessible sur http://localhost:5173
```

---

## 🧪 Tests

### Auth Service (Spring Boot)
```bash
cd backend
./mvnw clean verify
# 102 tests — BUILD SUCCESS
```

### Audio Service (Laravel)
```bash
cd audio-service
php artisan test
# 15 tests passent
```

### Billing Service (Laravel)
```bash
cd billing-service
php artisan test
# 13 tests passent
```

### Résumé couverture

| Service | Tests | Statut |
|---------|-------|--------|
| Auth Service | 102 | ✅ |
| Audio Service | 15 | ✅ |
| Billing Service | 13 | ✅ |
| **Total** | **130** | ✅ |

---

## ⚙️ CI/CD

Le pipeline GitHub Actions exécute automatiquement à chaque push sur `main` :
Push → GitHub Actions
│
├── Auth Service
│   ├── Build Maven
│   ├── Tests (102)
│   ├── SonarCloud
│   └── Docker Push
│
├── Audio Service
│   ├── Tests PHP (15)
│   └── Docker Push
│
├── Billing Service
│   ├── Tests PHP (13)
│   └── Docker Push
│
└── Frontend React
├── Build Vite
└── Docker Push

---

## 🌍 Variables d'environnement

### Auth Service (`backend/src/main/resources/application.properties`)

| Variable | Description | Défaut |
|----------|-------------|--------|
| `SPRING_DATASOURCE_URL` | URL base de données | `jdbc:mysql://localhost:3306/db_auth` |
| `APP_SMK` | Master Key AES | `moustass2024key!` |
| `JWT_SECRET` | Secret JWT | `moustass2024jwtsecretkeylongenough32chars` |
| `JWT_EXPIRATION` | Durée JWT (ms) | `900000` (15 min) |

### Audio Service (`audio-service/.env`)

| Variable | Description |
|----------|-------------|
| `DB_HOST` | Hôte MySQL |
| `AUDIO_ENCRYPTION_KEY` | Clé AES audio |
| `AUTH_SERVICE_URL` | URL auth-service |

### Billing Service (`billing-service/.env`)

| Variable | Description |
|----------|-------------|
| `DB_HOST` | Hôte MySQL |
| `AUTH_SERVICE_URL` | URL auth-service |

---

## 🛠️ Choix techniques

### Pourquoi Spring Boot pour l'Auth Service ?
Spring Boot offre un écosystème mature pour la sécurité (HMAC, JWT, AES-GCM) et une excellente intégration avec JPA/MySQL. Le code TP5 existant a été réutilisé et enrichi.

### Pourquoi Laravel pour les services Audio et Billing ?
Laravel propose une architecture MVC claire, un ORM Eloquent puissant et un système de tests intégré. Il est particulièrement adapté aux APIs REST.

### Pourquoi React pour le Frontend ?
React permet une expérience utilisateur fluide avec un état local géré efficacement. Vite assure des builds rapides et une DX optimale.

### Pourquoi 3 bases MySQL séparées ?
Conformément à l'architecture **Zero Trust** et aux bonnes pratiques microservices, chaque service possède sa propre base de données isolée. Cela garantit l'indépendance des données et la scalabilité individuelle.

---

## 👨‍💻 Auteur

**Nirina** — *Moustass CloudSec Project*
Barbichetz Ltd — Architecture Cloud Sécurisée

---

<div align="center">

*Moustass CloudSec — Zero Trust, Always Verify*

</div>
