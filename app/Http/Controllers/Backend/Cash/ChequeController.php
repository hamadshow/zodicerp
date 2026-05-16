<?php

namespace App\Http\Controllers\Backend\Cash;

use App\Http\Controllers\Controller;
use App\Models\CashAccount;
use App\Models\Cheque;
use App\Models\ChequeTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ChequeController extends Controller
{
    public function index(Request $request)
    {
        $query = Cheque::query()->with(['account', 'creator']);

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('cheque_no', 'like', "%{$search}%")
                    ->orWhere('bank_name', 'like', "%{$search}%")
                    ->orWhere('owner_name', 'like', "%{$search}%")
                    ->orWhere('reference_no', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('type')) {
            $query->where('cheque_type', $request->input('type'));
        }

        if ($request->filled('date_from')) {
            $query->whereDate('issue_date', '>=', $request->input('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('issue_date', '<=', $request->input('date_to'));
        }

        $cheques = $query->orderBy('issue_date', 'desc')->paginate(10)->withQueryString();

        $stats = [
            'total' => Cheque::count(),
            'pending' => Cheque::where('status', 'pending')->count(),
            'collected' => Cheque::where('status', 'collected')->count(),
            'bounced' => Cheque::where('status', 'bounced')->count(),
            'total_amount' => Cheque::sum('amount'),
        ];

        $accounts = CashAccount::select('id', 'name', 'account_code')->get();

        return Inertia::render('Backend/06-Cash/Cheque', [
            'cheques' => $cheques,
            'filters' => $request->only(['search', 'status', 'type', 'date_from', 'date_to']),
            'stats' => $stats,
            'accounts' => $accounts,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'cheque_no' => 'required|string|max:50|unique:cheques,cheque_no',
            'bank_name' => 'required|string|max:100',
            'account_id' => 'nullable|exists:cash_accounts,id',
            'owner_name' => 'required|string|max:100',
            'cheque_type' => 'required|in:received,issued',
            'amount' => 'required|numeric|min:0',
            'issue_date' => 'required|date',
            'due_date' => 'nullable|date|after_or_equal:issue_date',
            'status' => 'required|in:pending,collected,bounced,cancelled',
            'reference_no' => 'nullable|string|max:50',
            'notes' => 'nullable|string',
        ]);

        DB::transaction(function () use ($validated) {
            $validated['created_by'] = Auth::id();
            $cheque = Cheque::create($validated);

            // Create initial transaction
            ChequeTransaction::create([
                'cheque_id' => $cheque->id,
                'action' => 'created',
                'action_date' => now(),
                'account_id' => $validated['account_id'],
                'amount' => $validated['amount'],
                'notes' => 'Cheque created initially with status: '.$validated['status'],
                'created_by' => Auth::id(),
            ]);
        });

        return redirect()->route('admin.cheques.index')->with('success', 'Cheque created successfully.');
    }

    public function update(Request $request, Cheque $cheque)
    {
        $validated = $request->validate([
            'cheque_no' => 'required|string|max:50|unique:cheques,cheque_no,'.$cheque->id,
            'bank_name' => 'required|string|max:100',
            'account_id' => 'nullable|exists:cash_accounts,id',
            'owner_name' => 'required|string|max:100',
            'cheque_type' => 'required|in:received,issued',
            'amount' => 'required|numeric|min:0',
            'issue_date' => 'required|date',
            'due_date' => 'nullable|date|after_or_equal:issue_date',
            'status' => 'required|in:pending,collected,bounced,cancelled',
            'reference_no' => 'nullable|string|max:50',
            'notes' => 'nullable|string',
        ]);

        DB::transaction(function () use ($validated, $cheque) {
            $oldStatus = $cheque->status;
            $validated['updated_by'] = Auth::id();
            $cheque->update($validated);

            // Log transaction if status changed
            if ($oldStatus !== $validated['status']) {
                ChequeTransaction::create([
                    'cheque_id' => $cheque->id,
                    'action' => 'status_updated',
                    'action_date' => now(),
                    'account_id' => $validated['account_id'],
                    'amount' => $validated['amount'],
                    'notes' => "Status changed from {$oldStatus} to {$validated['status']}",
                    'created_by' => Auth::id(),
                ]);
            } else {
                // Log generic update
                ChequeTransaction::create([
                    'cheque_id' => $cheque->id,
                    'action' => 'updated',
                    'action_date' => now(),
                    'account_id' => $validated['account_id'],
                    'amount' => $validated['amount'],
                    'notes' => 'Cheque details updated',
                    'created_by' => Auth::id(),
                ]);
            }
        });

        return redirect()->route('admin.cheques.index')->with('success', 'Cheque updated successfully.');
    }

    public function destroy(Cheque $cheque)
    {
        $cheque->delete();

        return redirect()->route('admin.cheques.index')->with('success', 'Cheque deleted successfully.');
    }
}
