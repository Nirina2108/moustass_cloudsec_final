<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AudioController;
use App\Http\Controllers\MessageController;

Route::middleware('jwt')->group(function () {
    Route::get('/audio', [AudioController::class, 'index']);
    Route::post('/audio', [AudioController::class, 'store']);
    Route::get('/audio/{id}', [AudioController::class, 'show']);
    Route::put('/audio/{id}', [AudioController::class, 'update']);
    Route::delete('/audio/{id}', [AudioController::class, 'destroy']);

    Route::get('/messages', [MessageController::class, 'index']);
    Route::get('/messages/unread-count', [MessageController::class, 'unreadCount']);
    Route::post('/messages', [MessageController::class, 'store']);
    Route::get('/messages/{id}', [MessageController::class, 'show']);
    Route::put('/messages/{id}/read', [MessageController::class, 'markRead']);
    Route::delete('/messages/{id}', [MessageController::class, 'destroy']);
});