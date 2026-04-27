<?php

namespace App\Services;

/**
 * Service de chiffrement AES-256-CBC des enregistrements audio.
 */
class AudioEncryptionService
{
    private string $key;

    public function __construct()
    {
        $this->key = env('AUDIO_ENCRYPTION_KEY', 'moustass2024audiokey!');
    }

    /**
     * Chiffre les donnees audio en AES-256-CBC.
     *
     * @param string $data donnees en clair
     * @return string donnees chiffrees en base64
     */
    public function encrypt(string $data): string
    {
        $iv = random_bytes(16);
        $encrypted = openssl_encrypt($data, 'AES-256-CBC', $this->key, 0, $iv);
        return base64_encode($iv . $encrypted);
    }

    /**
     * Dechiffre les donnees audio.
     *
     * @param string $encryptedData donnees chiffrees en base64
     * @return string donnees en clair
     */
    public function decrypt(string $encryptedData): string
    {
        $decoded = base64_decode($encryptedData);
        $iv = substr($decoded, 0, 16);
        $encrypted = substr($decoded, 16);
        return openssl_decrypt($encrypted, 'AES-256-CBC', $this->key, 0, $iv);
    }

    /**
     * Calcule le hash SHA-256 des donnees.
     *
     * @param string $data donnees
     * @return string hash SHA-256
     */
    public function hash(string $data): string
    {
        return hash('sha256', $data);
    }
}