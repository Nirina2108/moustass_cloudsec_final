<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Modele Invoice.
 * Represente une facture.
 */
class Invoice extends Model
{
    use HasFactory;

    protected $table = 'invoices';

    protected $fillable = [
        'user_id',
        'invoice_number',
        'reference',
        'customer_name',
        'customer_email',
        'customer_address',
        'customer_phone',
        'amount',
        'vat_rate',
        'items',
        'description',
        'status',
        'due_date',
        'payment_terms',
        'paid_at',
    ];

    protected $casts = [
        'due_date' => 'date',
        'paid_at' => 'datetime',
        'amount' => 'float',
        'vat_rate' => 'float',
        'items' => 'array',
    ];
}