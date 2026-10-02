<?php

namespace App\Http\Controllers\Backend\HumanResource;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Deduction;
use App\Models\Employee;
use App\Models\EndOfServiceRecord;
use App\Models\EmployeeContract;
use App\Models\Nationality;
use App\Models\PayrollPeriod;
use App\Models\Reward;
use App\Models\Vacation;
use App\Models\Assets\Department;
use App\Models\Backend\HumanResource\Profession;
use App\Services\CompanyContext;
use Inertia\Inertia;
use Inertia\Response;

class HrDashboardController extends Controller
{
    public function __construct(private readonly CompanyContext $companyContext)
    {
    }

    public function index(): Response
    {
        $companyId = $this->companyContext->id();
        $today = now()->toDateString();

        $stats = [
            'totalEmployees' => Employee::query()->count(),
            'activeEmployees' => Employee::query()->where('status', 'active')->count(),
            'departments' => Department::query()->count(),
            'professions' => Profession::query()->where('company_id', $companyId)->count(),
            'attendanceToday' => Attendance::query()->whereDate('date', $today)->count(),
            'pendingDeductions' => Deduction::query()->where('status', 'pending')->count(),
            'pendingRewards' => Reward::query()->where('status', 'pending')->count(),
            'openPayrollPeriods' => PayrollPeriod::query()->whereIn('status', ['draft', 'calculated', 'reviewed'])->count(),
            'nationalities' => Nationality::query()->count(),
            'pendingVacations' => Vacation::query()->where('company_id', $companyId)->where('status', 'pending')->count(),
            'expiringContracts' => EmployeeContract::query()
                ->where('company_id', $companyId)
                ->where('status', 'active')
                ->whereNotNull('end_date')
                ->whereBetween('end_date', [$today, now()->addDays(30)->toDateString()])
                ->count(),
            'pendingEos' => EndOfServiceRecord::query()->where('company_id', $companyId)->where('status', 'pending')->count(),
        ];

        return Inertia::render('Backend/02_human_resource/dashboard', [
            'hrStats' => $stats,
        ]);
    }
}
