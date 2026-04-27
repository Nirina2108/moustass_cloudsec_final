<?php

namespace App\Http\Controllers;

use App\Models\AudioRecord;
use App\Services\AudioEncryptionService;
use Illuminate\Http\Request;

/**
 * Controller pour la gestion des enregistrements audio.
 */
class AudioController extends Controller
{
    private AudioEncryptionService $encryptionService;

    public function __construct(AudioEncryptionService $encryptionService)
    {
        $this->encryptionService = $encryptionService;
    }

    /**
     * Liste tous les enregistrements de l'utilisateur.
     */
    public function index(Request $request)
    {
        $userId = $request->auth_user['id'] ?? 1;
        $records = AudioRecord::where('user_id', $userId)->get();
        return response()->json($records);
    }

    /**
     * Cree un nouvel enregistrement audio chiffre.
     */
    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'data' => 'required|string',
        ]);

        $userId = $request->auth_user['id'] ?? 1;
        $data = $request->input('data');

        $encrypted = $this->encryptionService->encrypt($data);
        $hash = $this->encryptionService->hash($data);

        $record = AudioRecord::create([
            'user_id' => $userId,
            'title' => $request->input('title'),
            'encrypted_data' => $encrypted,
            'sha256_hash' => $hash,
            'duration' => $request->input('duration', 0),
        ]);

        return response()->json([
            'message' => 'Enregistrement cree avec succes',
            'id' => $record->id,
            'title' => $record->title,
            'sha256_hash' => $record->sha256_hash,
        ], 201);
    }

    /**
     * Retourne un enregistrement dechiffre.
     */
    public function show(Request $request, int $id)
    {
        $userId = $request->auth_user['id'] ?? 1;
        $record = AudioRecord::where('id', $id)
            ->where('user_id', $userId)
            ->firstOrFail();

        $decrypted = $this->encryptionService->decrypt($record->encrypted_data);

        return response()->json([
            'id' => $record->id,
            'title' => $record->title,
            'data' => $decrypted,
            'sha256_hash' => $record->sha256_hash,
            'duration' => $record->duration,
        ]);
    }

    /**
     * Met a jour un enregistrement.
     */
    public function update(Request $request, int $id)
    {
        $userId = $request->auth_user['id'] ?? 1;
        $record = AudioRecord::where('id', $id)
            ->where('user_id', $userId)
            ->firstOrFail();

        if ($request->has('title')) {
            $record->title = $request->input('title');
        }

        if ($request->has('data')) {
            $data = $request->input('data');
            $record->encrypted_data = $this->encryptionService->encrypt($data);
            $record->sha256_hash = $this->encryptionService->hash($data);
        }

        $record->save();

        return response()->json(['message' => 'Enregistrement mis a jour']);
    }

    /**
     * Supprime un enregistrement.
     */
    public function destroy(Request $request, int $id)
    {
        $userId = $request->auth_user['id'] ?? 1;
        $record = AudioRecord::where('id', $id)
            ->where('user_id', $userId)
            ->firstOrFail();

        $record->delete();

        return response()->json(['message' => 'Enregistrement supprime']);
    }
}