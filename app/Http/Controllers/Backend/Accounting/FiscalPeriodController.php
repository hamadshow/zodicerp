<?php

namespace App\Http\Controllers\Backend\Accounting;

use App\Http\Controllers\Controller;
use App\Services\Accounting\FiscalPeriodService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class FiscalPeriodController extends Controller
{
    public function __construct(
        protected FiscalPeriodService $periodService
    ) {}

    public function index(Request $request): Response
    {
        $companyId = auth()->user()->company_id ?? 1;



        // Use raw query since the model may not exist
        $fiscalYears = DB::table('fiscal_years')
            ->where('company_id', $companyId)
            ->orderByDesc('start_date')
            ->get();

        $periods = DB::table('accounting_periods')
            ->join('fiscal_years', 'fiscal_years.id', '=', 'accounting_periods.fiscal_year_id')
            ->where('fiscal_years.company_id', $companyId)
            ->orderBy('accounting_periods.start_date')
            ->get();

        return Inertia::render('Backend/07-Accounting/FiscalPeriods', [
            'fiscalYears' => $fiscalYears,
            'periods' => $periods,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
        ]);

        try {
            $year = $this->periodService->createFiscalYear($validated);
            return redirect()->back()->with('success', "Fiscal year {$year->name} created with accounting periods.");
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage())->withInput();
        }
    }

    public function open($id)
    {
        try {
            $year = $this->periodService->openFiscalYear((int) $id);
            return redirect()->back()->with('success', "Fiscal year {$year->name} is now open.");
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    public function close($id)
    {
        try {
            $year = $this->periodService->closeFiscalYear((int) $id);
            return redirect()->back()->with('success', "Fiscal year {$year->name} closed. All periods locked.");
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    public function closePeriod($id)
    {
        try {
            $period = $this->periodService->closePeriod((int) $id);
            return redirect()->back()->with('success', "Period {$period->name} closed.");
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    public function reopenPeriod($id)
    {
        try {
            $period = $this->periodService->reopenPeriod((int) $id);
            return redirect()->back()->with('success', "Period {$period->name} reopened.");
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }
}
