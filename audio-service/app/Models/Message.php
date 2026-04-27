<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Modele Message.
 * Represente un message audio chiffre entre deux utilisateurs.
 */
class Message extends Model
{
    use HasFactory;

    protected $table = 'messages';

    protected $fillable = [
        'sender_id',
        'receiver_id',
        'title',
        'encrypted_data',
        'audio_hash',
        'duration',
        'is_read',
    ];

    protected $casts = [
        'is_read' => 'boolean',
        'duration' => 'integer',
    ];
}
