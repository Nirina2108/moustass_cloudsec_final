<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE audio_records MODIFY encrypted_data LONGTEXT NOT NULL');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE audio_records MODIFY encrypted_data TEXT NOT NULL');
    }
};
