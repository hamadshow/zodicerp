<?php

namespace App\Http\Controllers\Backend\Cash;

use App\Http\Controllers\Controller;
use App\Models\Bank;
use App\Models\CashAccount;
use App\Models\Currency;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class PettyCashController extends Controller
{
    public function index(Request $request)
    {
        $query = CashAccount::query()->with('bank');

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('account_code', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        $cashAccounts = $query->latest()->paginate(10)->withQueryString();

        // Get Banks for dropdown
        $banks = Bank::where('status', 'active')->select('id', 'name')->get();

        $currencies = Currency::where('status', 'active')->select('id', 'code', 'name')->get();

        return Inertia::render('Backend/06-Cash/PettyCash', [
            'cashAccounts' => $cashAccounts,
            'filters' => $request->only(['search', 'status']),
            'banks' => $banks,
            'currencies' => $currencies,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'account_code' => 'required|string|unique:cash_accounts,account_code',
            'name' => 'required|string|max:255',
            'type' => 'nullable|string|max:50',
            'bank_id' => 'nullable|exists:banks,id',
            'currency' => 'required|exists:currencies,id',
            'opening_balance' => 'required|numeric',
            'current_balance' => 'required|numeric',
            'status' => 'required|in:active,inactive',
            'is_default' => 'boolean',
        ]);

        $validated['created_by'] = Auth::id();

        CashAccount::create($validated);

        return redirect()->back()->with('success', 'Cash account created successfully.');
    }

    public function update(Request $request, CashAccount $petty_cash)
    {
        $validated = $request->validate([
            'account_code' => 'required|string|unique:cash_accounts,account_code,'.$petty_cash->id,
            'name' => 'required|string|max:255',
            'type' => 'nullable|string|max:50',
            'bank_id' => 'nullable|exists:banks,id',
            'currency' => 'required|exists:currencies,id',
            'opening_balance' => 'required|numeric',
            'current_balance' => 'required|numeric',
            'status' => 'required|in:active,inactive',
            'is_default' => 'boolean',
        ]);

        $validated['updated_by'] = Auth::id();

        $petty_cash->update($validated);

        return redirect()->back()->with('success', 'Cash account updated successfully.');
    }

    public function destroy(CashAccount $petty_cash)
    {
        $petty_cash->delete();

        return redirect()->back()->with('success', 'Cash account deleted successfully.');
    }
}
