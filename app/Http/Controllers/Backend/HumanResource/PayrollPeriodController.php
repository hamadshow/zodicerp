<?php

namespace App\Http\Controllers\Backend\HumanResource;

use App\Http\Controllers\Controller;
use App\Http\Requests\HumanResource\CalculatePayrollRequest;
use App\Http\Requests\HumanResource\StorePayrollPeriodRequest;
use App\Models\PayrollPeriod;
use App\Services\CompanyContext;
use App\Services\Payroll\PayrollCalculationService;
use App\Services\Payroll\PayrollWorkflowService;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class PayrollPeriodController extends Controller
{
    public function __construct(private readonly CompanyContext $companyContext)
    {
    }

    public function index()
    {
        return response()->json(
            PayrollPeriod::query()
                ->where('company_id', $this->companyContext->id())
                ->withCount('results')
                ->latest('start_date')
                ->get()
        );
    }

    public function store(StorePayrollPeriodRequest $request)
    {
        $companyId = $this->companyContext->id();
        $start = CarbonImmutable::parse($request->validated('start_date'))->startOfDay();
        $end = CarbonImmutable::parse($request->validated('end_date'))->endOfDay();
        $overlap = PayrollPeriod::query()
            ->where('company_id', $companyId)
            ->whereDate('start_date', '<=', $end->toDateString())
            ->whereDate('end_date', '>=', $start->toDateString())
            ->exists();
        if ($overlap) {
            throw ValidationException::withMessages(['start_date' => 'Payroll period overlaps an existing period.']);
        }

        $period = PayrollPeriod::create([
            ...$request->validated(),
            'status' => 'draft',
            'company_id' => $companyId,
            'created_by' => $request->user()?->getAuthIdentifier(),
        ]);
        return response()->json(['data' => $period], 201);
    }

    public function show(PayrollPeriod $payrollPeriod)
    {
        abort_unless((int) $payrollPeriod->company_id === $this->companyContext->id(), 404);
        return response()->json($payrollPeriod->load('results.employee', 'results.components'));
    }

    public function calculate(CalculatePayrollRequest $request, PayrollPeriod $payrollPeriod, PayrollCalculationService $calculator)
    {
        $this->authorizePeriod($payrollPeriod);
        $result = $calculator->calculate($payrollPeriod, (int) $request->validated('employee_id'), (bool) $request->validated('recalculate', false));
        return response()->json(['data' => $result]);
    }

    public function review(Request $request, PayrollPeriod $payrollPeriod, PayrollWorkflowService $workflow)
    {
        $this->authorizePeriod($payrollPeriod);
        return response()->json(['data' => $workflow->transition($payrollPeriod, 'reviewed', $request->user()?->getAuthIdentifier())]);
    }

    public function approve(Request $request, PayrollPeriod $payrollPeriod, PayrollWorkflowService $workflow)
    {
        $this->authorizePeriod($payrollPeriod);
        return response()->json(['data' => $workflow->transition($payrollPeriod, 'approved', $request->user()?->getAuthIdentifier())]);
    }

    public function post(Request $request, PayrollPeriod $payrollPeriod, PayrollWorkflowService $workflow)
    {
        $this->authorizePeriod($payrollPeriod);
        return response()->json(['data' => $workflow->transition($payrollPeriod, 'posted', $request->user()?->getAuthIdentifier())]);
    }

    public function close(Request $request, PayrollPeriod $payrollPeriod, PayrollWorkflowService $workflow)
    {
        $this->authorizePeriod($payrollPeriod);
        return response()->json(['data' => $workflow->transition($payrollPeriod, 'closed', $request->user()?->getAuthIdentifier())]);
    }

    public function results(PayrollPeriod $payrollPeriod)
    {
        $this->authorizePeriod($payrollPeriod);
        return response()->json($payrollPeriod->results()->with(['employee', 'components'])->get());
    }

    private function authorizePeriod(PayrollPeriod $payrollPeriod): void
    {
        abort_unless((int) $payrollPeriod->company_id === $this->companyContext->id(), 404);
    }
}
