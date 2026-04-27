<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use Illuminate\Http\Request;

/**
 * Controller pour la gestion des factures.
 */
class InvoiceController extends Controller
{
    /**
     * Liste toutes les factures de l'utilisateur.
     */
    public function index(Request $request)
    {
        $userId = $request->auth_user['id'] ?? 1;
        $invoices = Invoice::where('user_id', $userId)->get();
        return response()->json($invoices);
    }

    /**
     * Cree une nouvelle facture.
     */
    public function store(Request $request)
    {
        $request->validate([
            'amount' => 'nullable|numeric|min:0',
            'description' => 'nullable|string|max:500',
            'due_date' => 'nullable|date',
            'reference' => 'nullable|string|max:100',
            'customer_name' => 'nullable|string|max:255',
            'customer_email' => 'nullable|string|max:255',
            'customer_address' => 'nullable|string|max:1000',
            'customer_phone' => 'nullable|string|max:50',
            'vat_rate' => 'nullable|numeric|min:0|max:100',
            'items' => 'nullable|array',
            'items.*.description' => 'required_with:items|string|max:255',
            'items.*.quantity' => 'required_with:items|numeric|min:0',
            'items.*.unit' => 'nullable|string|max:30',
            'items.*.unit_price' => 'required_with:items|numeric|min:0',
            'items.*.vat_rate' => 'nullable|numeric|min:0|max:100',
            'payment_terms' => 'nullable|string|max:1000',
        ]);

        $userId = $request->auth_user['id'] ?? 1;
        $items = $request->input('items', []);
        $vatRate = (float) $request->input('vat_rate', 20.0);

        $amount = $request->input('amount');
        if (!empty($items)) {
            $amount = 0;
            foreach ($items as $item) {
                $qty = (float) ($item['quantity'] ?? 0);
                $price = (float) ($item['unit_price'] ?? 0);
                $amount += $qty * $price;
            }
        }

        if ($amount === null || $amount === '') {
            return response()->json(['error' => 'Montant ou lignes obligatoires'], 422);
        }

        $description = $request->input('description');
        if (empty($description)) {
            if (!empty($items)) {
                $labels = array_filter(array_map(fn($i) => $i['description'] ?? '', $items));
                $description = implode(' / ', $labels);
            }
            if (empty($description)) {
                $description = 'Facture ' . now()->format('Y-m-d');
            }
        }

        $invoice = Invoice::create([
            'user_id' => $userId,
            'reference' => $request->input('reference'),
            'customer_name' => $request->input('customer_name'),
            'customer_email' => $request->input('customer_email'),
            'customer_address' => $request->input('customer_address'),
            'customer_phone' => $request->input('customer_phone'),
            'amount' => $amount,
            'vat_rate' => $vatRate,
            'items' => $items ?: null,
            'description' => $description,
            'due_date' => $request->input('due_date'),
            'payment_terms' => $request->input('payment_terms'),
            'status' => 'pending',
        ]);

        if (empty($invoice->invoice_number)) {
            $invoice->invoice_number = 'FAC-' . str_pad((string) $invoice->id, 4, '0', STR_PAD_LEFT);
            $invoice->save();
        }

        return response()->json([
            'message' => 'Facture creee avec succes',
            'invoice' => $invoice,
        ], 201);
    }

    /**
     * Retourne une facture.
     */
    public function show(Request $request, int $id)
    {
        $userId = $request->auth_user['id'] ?? 1;
        $invoice = Invoice::where('id', $id)
            ->where('user_id', $userId)
            ->firstOrFail();

        return response()->json($invoice);
    }

    /**
     * Met a jour une facture.
     */
    public function update(Request $request, int $id)
    {
        $userId = $request->auth_user['id'] ?? 1;
        $invoice = Invoice::where('id', $id)
            ->where('user_id', $userId)
            ->firstOrFail();

        $invoice->update($request->only(['amount', 'description']));

        return response()->json(['message' => 'Facture mise a jour']);
    }

    /**
     * Supprime une facture.
     */
    public function destroy(Request $request, int $id)
    {
        $userId = $request->auth_user['id'] ?? 1;
        $invoice = Invoice::where('id', $id)
            ->where('user_id', $userId)
            ->firstOrFail();

        $invoice->delete();

        return response()->json(['message' => 'Facture supprimee']);
    }

    /**
     * Marque une facture comme payee.
     */
    public function pay(Request $request, int $id)
    {
        $userId = $request->auth_user['id'] ?? 1;
        $invoice = Invoice::where('id', $id)
            ->where('user_id', $userId)
            ->firstOrFail();

        if ($invoice->status === 'paid') {
            return response()->json(['error' => 'Facture deja payee'], 400);
        }

        $invoice->update([
            'status' => 'paid',
            'paid_at' => now(),
        ]);

        return response()->json(['message' => 'Facture payee avec succes']);
    }
}
