<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->string('title', 255)->nullable()->after('receiver_id');
            $table->longText('encrypted_data')->nullable()->after('title');
            $table->integer('duration')->default(0)->after('audio_hash');
        });
        \Illuminate\Support\Facades\DB::statement('ALTER TABLE messages MODIFY audio_path VARCHAR(500) NULL');
    }

    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropColumn(['title', 'encrypted_data', 'duration']);
        });
    }
};
