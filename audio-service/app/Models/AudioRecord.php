<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Modele AudioRecord.
 * Represente un enregistrement audio chiffre.
 */
class AudioRecord extends Model
{
    use HasFactory;

    protected $table = 'audio_records';

    protected $fillable = [
        'user_id',
        'title',
        'encrypted_data',
        'sha256_hash',
        'duration',
    ];

    protected $hidden = [
        'encrypted_data',
    ];
}