<?php

namespace App\Http\Controllers;

use App\Models\Message;
use App\Services\AudioEncryptionService;
use Illuminate\Http\Request;

/**
 * Controller pour la messagerie audio chiffree.
 */
class MessageController extends Controller
{
    private AudioEncryptionService $encryptionService;

    public function __construct(AudioEncryptionService $encryptionService)
    {
        $this->encryptionService = $encryptionService;
    }

    /**
     * Liste les messages : box=inbox (recus) ou sent (envoyes).
     */
    public function index(Request $request)
    {
        $userId = $request->auth_user['id'] ?? 1;
        $box = $request->query('box', 'inbox');

        $query = Message::query();
        if ($box === 'sent') {
            $query->where('sender_id', $userId);
        } else {
            $query->where('receiver_id', $userId);
        }

        $messages = $query->orderByDesc('created_at')->get([
            'id', 'sender_id', 'receiver_id', 'title',
            'audio_hash', 'duration', 'is_read', 'created_at',
        ]);

        return response()->json($messages);
    }

    /**
     * Compte les messages non lus dans la boite de reception.
     */
    public function unreadCount(Request $request)
    {
        $userId = $request->auth_user['id'] ?? 1;
        $count = Message::where('receiver_id', $userId)
            ->where('is_read', false)
            ->count();
        return response()->json(['count' => $count]);
    }

    /**
     * Envoie un message audio chiffre a un destinataire.
     * Body : { receiver_id, title, data (data URL audio), duration }
     */
    public function store(Request $request)
    {
        $request->validate([
            'receiver_id' => 'required|integer',
            'title' => 'nullable|string|max:255',
            'data' => 'required|string',
            'duration' => 'nullable|integer|min:0',
        ]);

        $userId = $request->auth_user['id'] ?? 1;
        $receiverId = (int) $request->input('receiver_id');

        if ($receiverId === $userId) {
            return response()->json(['error' => 'Impossible de s envoyer un message a soi-meme'], 422);
        }

        $data = $request->input('data');
        $encrypted = $this->encryptionService->encrypt($data);
        $hash = $this->encryptionService->hash($data);

        $message = Message::create([
            'sender_id' => $userId,
            'receiver_id' => $receiverId,
            'title' => $request->input('title', 'Message audio'),
            'encrypted_data' => $encrypted,
            'audio_hash' => $hash,
            'duration' => (int) $request->input('duration', 0),
            'is_read' => false,
        ]);

        return response()->json([
            'message' => 'Message envoye',
            'id' => $message->id,
            'audio_hash' => $message->audio_hash,
            'created_at' => $message->created_at,
        ], 201);
    }

    /**
     * Recupere et dechiffre un message (marque comme lu si destinataire).
     */
    public function show(Request $request, int $id)
    {
        $userId = $request->auth_user['id'] ?? 1;
        $message = Message::where('id', $id)
            ->where(function ($q) use ($userId) {
                $q->where('sender_id', $userId)->orWhere('receiver_id', $userId);
            })
            ->firstOrFail();

        if ($message->receiver_id === $userId && !$message->is_read) {
            $message->is_read = true;
            $message->save();
        }

        $decrypted = $this->encryptionService->decrypt($message->encrypted_data);

        return response()->json([
            'id' => $message->id,
            'sender_id' => $message->sender_id,
            'receiver_id' => $message->receiver_id,
            'title' => $message->title,
            'data' => $decrypted,
            'audio_hash' => $message->audio_hash,
            'duration' => $message->duration,
            'is_read' => $message->is_read,
            'created_at' => $message->created_at,
        ]);
    }

    /**
     * Marque un message comme lu (manuellement).
     */
    public function markRead(Request $request, int $id)
    {
        $userId = $request->auth_user['id'] ?? 1;
        $message = Message::where('id', $id)
            ->where('receiver_id', $userId)
            ->firstOrFail();

        $message->is_read = true;
        $message->save();

        return response()->json(['message' => 'Marque comme lu']);
    }

    /**
     * Supprime un message (par son destinataire ou expediteur).
     */
    public function destroy(Request $request, int $id)
    {
        $userId = $request->auth_user['id'] ?? 1;
        $message = Message::where('id', $id)
            ->where(function ($q) use ($userId) {
                $q->where('sender_id', $userId)->orWhere('receiver_id', $userId);
            })
            ->firstOrFail();

        $message->delete();

        return response()->json(['message' => 'Message supprime']);
    }
}
