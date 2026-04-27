<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware de validation JWT via auth-service.
 */
class JwtMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();

        if (!$token) {
            return response()->json(['error' => 'Token manquant'], 401);
        }

        $error = null;
        try {
            $response = Http::withToken($token)
                ->get(env('AUTH_SERVICE_URL') . '/api/auth/me');

            $body = $response->json();
            if ($response->failed() || !is_array($body) || isset($body['error']) || empty($body['id'])) {
                $error = 'Token invalide';
            } else {
                $request->merge(['auth_user' => $body]);
            }
        } catch (\Exception $e) {
            $error = 'Erreur authentification';
        }

        if ($error) {
            return response()->json(['error' => $error], 401);
        }

        return $next($request);
    }
}