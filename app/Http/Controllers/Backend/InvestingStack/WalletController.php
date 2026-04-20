<?php

namespace App\Http\Controllers\Backend\InvestingStack;

use App\Http\Controllers\Controller;
use App\Models\Currency;
use App\Models\InvestingStack\Broker;
use App\Models\InvestingStack\WalletTransaction;
use Illuminate\Http\Request;
use Inertia\Inertia;

class WalletController extends Controller
{
    public function index(Request $request)
    {
        $query = WalletTransaction::with(['currency', 'broker']);

        if ($request->search) {
            $query->where('reference_id', 'like', '%' . $request->search . '%')
                  ->orWhere('description', 'like', '%' . $request->search . '%');
        }

        if ($request->type) {
            $query->where('transaction_type', $request->type);
        }

        $transactions = $query->orderBy('transaction_date', 'desc')
                             ->paginate(15)
                             ->withQueryString();

        $currencies = Currency::select('id', 'name', 'code')->get();
        $brokers = Broker::select('id', 'broker_code', 'broker_name_ar', 'broker_name_en')->orderBy('broker_name_ar')->get();
        
        // Calculate balance
        $deposits = WalletTransaction::where('transaction_type', 'DEPOSIT')
                                   ->where('status', 'COMPLETED')
                                   ->sum('amount');
        $withdraws = WalletTransaction::where('transaction_type', 'WITHDRAW')
                                    ->where('status', 'COMPLETED')
                                    ->sum('amount');
        $balance = $deposits - $withdraws;

        return Inertia::render('Backend/InvestingStack/Wallet', [
            'transactions' => $transactions,
            'currencies' => $currencies,
            'brokers' => $brokers,
            'balance' => $balance,
            'filters' => $request->only(['search', 'type']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'transaction_type' => 'required|in:DEPOSIT,WITHDRAW',
            'amount' => 'required|numeric|min:0.01',
            'currency_id' => 'nullable|exists:currencies,id',
            'broker_id' => 'nullable|exists:brokers,id',
            'exchange_rate' => 'nullable|numeric|min:0',
            'reference_id' => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'status' => 'required|in:PENDING,COMPLETED,CANCELLED',
            'transaction_date' => 'required|date',
        ]);

        WalletTransaction::create($validated);

        return redirect()->back()->with('success', 'Transaction recorded successfully.');
    }

    public function update(Request $request, WalletTransaction $wallet)
    {
        $validated = $request->validate([
            'transaction_type' => 'required|in:DEPOSIT,WITHDRAW',
            'amount' => 'required|numeric|min:0.01',
            'currency_id' => 'nullable|exists:currencies,id',
            'broker_id' => 'nullable|exists:brokers,id',
            'exchange_rate' => 'nullable|numeric|min:0',
            'reference_id' => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'status' => 'required|in:PENDING,COMPLETED,CANCELLED',
            'transaction_date' => 'required|date',
        ]);

        $wallet->update($validated);

        return redirect()->back()->with('success', 'Transaction updated successfully.');
    }

    public function destroy(WalletTransaction $wallet)
    {
        $wallet->delete();

        return redirect()->back()->with('success', 'Transaction deleted successfully.');
    }
}
