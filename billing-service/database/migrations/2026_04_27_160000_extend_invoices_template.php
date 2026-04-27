<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->string('invoice_number')->nullable()->after('id');
            $table->string('reference')->nullable()->after('invoice_number');
            $table->string('customer_name')->nullable();
            $table->string('customer_email')->nullable();
            $table->text('customer_address')->nullable();
            $table->string('customer_phone')->nullable();
            $table->decimal('vat_rate', 5, 2)->default(20.00);
            $table->json('items')->nullable();
            $table->text('payment_terms')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn([
                'invoice_number',
                'reference',
                'customer_name',
                'customer_email',
                'customer_address',
                'customer_phone',
                'vat_rate',
                'items',
                'payment_terms',
            ]);
        });
    }
};
