<?php

namespace App\Http\Controllers\Backend\Cash;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Bank;
use App\Models\BankAccount; // Chart of Accounts
use App\Models\Currency;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class BankController extends Controller
{
    public function index(Request $request)
    {
        $query = Bank::query()->withCount('accounts');

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('bank_code', 'like', "%{$search}%")
                    ->orWhere('short_name', 'like', "%{$search}%")
                    ->orWhere('swift_code', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        $banks = $query->latest()->paginate(10)->withQueryString();

        // Get GL Accounts for dropdowns (assets/cash/bank type accounts ideally)
        // For now, fetching all or filtering by type if known.
        // Assuming we want leaf accounts.
        $glAccounts = Account::whereIn('Nature', ['cash', 'bank'])
            ->where('AccType', 1)
            ->where('AccStopped', false)
            ->select('AccID', 'AccName', 'AccCode')
            ->get();

        $currencies = Currency::where('status', 'active')->select('id', 'code', 'name')->get();

        return Inertia::render('Backend/06-Cash/Bank', [
            'banks' => $banks,
            'filters' => $request->only(['search', 'status']),
            'glAccounts' => $glAccounts,
            'currencies' => $currencies,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'bank_code' => 'required|string|unique:banks,bank_code',
            'name' => 'required|string|max:255',
            'short_name' => 'nullable|string|max:50',
            'swift_code' => 'nullable|string|max:20',
            'iban_prefix' => 'nullable|string|max:10',
            'country' => 'nullable|string|max:100',
            'currency' => 'nullable|string|max:10',
            'logo' => 'nullable|image|max:2048',
            'status' => 'required|in:active,inactive',
        ]);

        if ($request->hasFile('logo')) {
            $validated['logo'] = $request->file('logo')->store('banks', 'public');
        }

        Bank::create($validated);

        return redirect()->back()->with('success', 'Bank created successfully.');
    }

    public function update(Request $request, Bank $bank)
    {
        $validated = $request->validate([
            'bank_code' => 'required|string|unique:banks,bank_code,'.$bank->id,
            'name' => 'required|string|max:255',
            'short_name' => 'nullable|string|max:50',
            'swift_code' => 'nullable|string|max:20',
            'iban_prefix' => 'nullable|string|max:10',
            'country' => 'nullable|string|max:100',
            'currency' => 'nullable|string|max:10',
            'logo' => 'nullable|image|max:2048',
            'status' => 'required|in:active,inactive',
        ]);

        if ($request->hasFile('logo')) {
            if ($bank->logo) {
                Storage::disk('public')->delete($bank->logo);
            }
            $validated['logo'] = $request->file('logo')->store('banks', 'public');
        }

        $bank->update($validated);

        return redirect()->back()->with('success', 'Bank updated successfully.');
    }

    public function destroy(Bank $bank)
    {
        if ($bank->logo) {
            Storage::disk('public')->delete($bank->logo);
        }
        $bank->delete();

        return redirect()->back()->with('success', 'Bank deleted successfully.');
    }

    // Bank Account Methods (could be in separate controller but keeping here for simplicity as requested)

    public function storeAccount(Request $request)
    {
        $validated = $request->validate([
            'bank_id' => 'required|exists:banks,id',
            'account_name' => 'required|string|max:255',
            'account_number' => 'required|string|max:100|unique:bank_accounts,account_number',
            'iban' => 'nullable|string|max:50',
            'currency' => 'required|exists:currencies,id',
            'opening_balance' => 'required|numeric',
            'current_balance' => 'required|numeric',
            'gl_account_id' => 'nullable|exists:accounts,AccID',
            'is_default' => 'boolean',
            'status' => 'required|in:active,inactive',
        ]);

        if ($validated['is_default']) {
            BankAccount::where('bank_id', $validated['bank_id'])
                ->where('is_default', true)
                ->update(['is_default' => false]);
        }

        BankAccount::create($validated);

        return redirect()->back()->with('success', 'Bank account created successfully.');
    }

    public function updateAccount(Request $request, BankAccount $bankAccount)
    {
        $validated = $request->validate([
            'account_name' => 'required|string|max:255',
            'account_number' => 'required|string|max:100|unique:bank_accounts,account_number,'.$bankAccount->id,
            'iban' => 'nullable|string|max:50',
            'currency' => 'required|exists:currencies,id',
            'opening_balance' => 'required|numeric',
            'current_balance' => 'required|numeric',
            'gl_account_id' => 'nullable|exists:accounts,AccID',
            'is_default' => 'boolean',
            'status' => 'required|in:active,inactive',
        ]);

        if ($validated['is_default'] && !$bankAccount->is_default) {
            BankAccount::where('bank_id', $bankAccount->bank_id)
                ->where('is_default', true)
                ->update(['is_default' => false]);
        }

        $bankAccount->update($validated);

        return redirect()->back()->with('success', 'Bank account updated successfully.');
    }

    public function destroyAccount(BankAccount $bankAccount)
    {
        $bankAccount->delete();

        return redirect()->back()->with('success', 'Bank account deleted successfully.');
    }

    public function getAccounts(Bank $bank)
    {
        $accounts = $bank->accounts()->with(['glAccount', 'currencyInfo'])->get();

        return response()->json($accounts);
    }
}
