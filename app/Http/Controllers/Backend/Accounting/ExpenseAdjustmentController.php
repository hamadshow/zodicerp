<?php

namespace App\Http\Controllers\Backend\Accounting;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Accounting\ExpenseAdjustment;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ExpenseAdjustmentController extends Controller
{
    public function index(Request $request): Response
    {
        $companyId = $request->user()->company_id ?? 1;
        $entries = ExpenseAdjustment::query()
            ->where('company_id', $companyId)
            ->with(['expenseAccount:AccID,AccCode,AccName', 'prepaidAccount:AccID,AccCode,AccName', 'accruedAccount:AccID,AccCode,AccName'])
            ->latest('id')
            ->get();

        return Inertia::render('Backend/07-Accounting/Accrual_Prepayment', [
            'entries' => $entries,
            'accounts' => Account::query()
                ->where('AccStopped', 0)
                ->orderBy('AccCode')
                ->get(['AccID', 'AccCode', 'AccName']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validateAdjustment($request);
        $validated['company_id'] = $request->user()->company_id ?? 1;
        $validated['created_by'] = $request->user()->id;
        $this->setAmounts($validated);
        ExpenseAdjustment::create($validated);

        return back()->with('success', 'Expense adjustment created.');
    }

    public function update(Request $request, int $id): RedirectResponse
    {
        $companyId = $request->user()->company_id ?? 1;
        $adjustment = ExpenseAdjustment::query()->where('company_id', $companyId)->findOrFail($id);
        $validated = $this->validateAdjustment($request);
        $this->setAmounts($validated);
        $adjustment->update($validated);

        return back()->with('success', 'Expense adjustment updated.');
    }

    public function destroy(Request $request, int $id): RedirectResponse
    {
        $companyId = $request->user()->company_id ?? 1;
        ExpenseAdjustment::query()->where('company_id', $companyId)->findOrFail($id)->delete();

        return back()->with('success', 'Expense adjustment deleted.');
    }

    private function validateAdjustment(Request $request): array
    {
        $type = $request->input('adjustment_type');

        return $request->validate([
            'adjustment_type' => ['required', Rule::in([ExpenseAdjustment::TYPE_PREPAYMENT, ExpenseAdjustment::TYPE_ACCRUAL])],
            'description' => ['required', 'string', 'max:400'],
            'period_start' => ['required', 'date'],
            'period_end' => ['required', 'date', 'after_or_equal:period_start'],
            'recognition_method' => ['nullable', Rule::in(ExpenseAdjustment::METHODS)],
            'report_date' => ['nullable', 'date', 'after_or_equal:period_start'],
            'total_amount' => ['required', 'numeric', 'gt:0', 'max:999999999999.999'],
            'recognized_amount' => ['nullable', 'numeric', 'min:0', 'lte:total_amount'],
            'expense_account_id' => ['required', 'integer', 'exists:accounts,AccID'],
            'prepaid_account_id' => [Rule::requiredIf($type === ExpenseAdjustment::TYPE_PREPAYMENT), 'nullable', 'integer', 'exists:accounts,AccID'],
            'accrued_account_id' => [Rule::requiredIf($type === ExpenseAdjustment::TYPE_ACCRUAL), 'nullable', 'integer', 'exists:accounts,AccID'],
        ]);
    }

    private function setAmounts(array &$data): void
    {
        $data['recognized_amount'] = number_format((float) ($data['recognized_amount'] ?? 0), 3, '.', '');
        $data['remaining_balance'] = number_format((float) $data['total_amount'] - (float) $data['recognized_amount'], 3, '.', '');
        $data['prepaid_account_id'] = $data['adjustment_type'] === ExpenseAdjustment::TYPE_PREPAYMENT ? ($data['prepaid_account_id'] ?? null) : null;
        $data['accrued_account_id'] = $data['adjustment_type'] === ExpenseAdjustment::TYPE_ACCRUAL ? ($data['accrued_account_id'] ?? null) : null;
    }
}

