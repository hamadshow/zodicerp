<?php

use App\Http\Controllers\Backend\HumanResource\EmployeeController;
use App\Http\Controllers\Backend\HumanResource\AttendanceController;
use App\Http\Controllers\Backend\Location\LocationController;
use App\Http\Controllers\Backend\Tasks\TaskAssignmentController;
use App\Http\Controllers\Backend\Tasks\TaskAttachmentController;
use App\Http\Controllers\Backend\Tasks\TaskCategoryController;
use App\Http\Controllers\Backend\Tasks\TaskCommentController;
use App\Http\Controllers\Backend\Tasks\TaskController;
use App\Http\Controllers\Backend\Tasks\TaskPriorityController;
use App\Http\Controllers\Backend\Tasks\TaskStatusController;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use App\Models\Assets\Department;
use App\Models\Backend\HumanResource\Profession;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Enjoy building your API!
|
*/

Route::middleware('web')->group(function () {
    Route::get('tasks/categories', [TaskCategoryController::class, 'index']);
    Route::get('tasks/priorities', [TaskPriorityController::class, 'index']);
    Route::get('tasks/statuses', [TaskStatusController::class, 'index']);
    Route::get('tasks/statistics', [TaskController::class, 'statistics']);
    Route::apiResource('tasks', TaskController::class);
    Route::apiResource('assignments', TaskAssignmentController::class);
    Route::apiResource('attachments', TaskAttachmentController::class);
    Route::apiResource('comments', TaskCommentController::class);

    // Employee Routes
    Route::get('employees', [EmployeeController::class, 'getEmployees']);
    Route::post('employees', [EmployeeController::class, 'store']);
    Route::get('employees/{employee}', [EmployeeController::class, 'show']);
    Route::put('employees/{employee}', [EmployeeController::class, 'update']);
    Route::delete('employees/{employee}', [EmployeeController::class, 'destroy']);
    Route::post('employees/bulk-delete', [EmployeeController::class, 'bulkDelete']);
    Route::post('employees/bulk-update-status', [EmployeeController::class, 'bulkUpdateStatus']);

    // Attendance Routes
    Route::apiResource('attendance', AttendanceController::class);

    // Payroll Advance Routes
    Route::apiResource('payroll-advances', \App\Http\Controllers\Backend\HumanResource\PayrollAdvanceController::class);

    // Reward Routes
    Route::apiResource('rewards', \App\Http\Controllers\Backend\HumanResource\RewardController::class);

    // Deduction Routes
    Route::apiResource('deductions', \App\Http\Controllers\Backend\HumanResource\DeductionController::class);

    // Traffic Violation Routes
    Route::apiResource('traffic-violations', \App\Http\Controllers\Backend\HumanResource\TrafficViolationController::class);

    // Salary Receipt Routes
    Route::post('salary-receipts/calculate', [\App\Http\Controllers\Backend\HumanResource\SalaryReceiptController::class, 'calculate']);
    Route::apiResource('salary-receipts', \App\Http\Controllers\Backend\HumanResource\SalaryReceiptController::class);

    // Users Routes (separated from employees endpoints)
    Route::get('users', function (Request $request) {
        $query = User::query();

        if ($request->filled('search')) {
            $search = (string) $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('username', 'like', "%{$search}%")
                    ->orWhere('fullname', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('status', (string) $request->input('status'));
        }

        $users = $query->orderBy('created_at', 'desc')->paginate((int) $request->input('per_page', 10));

        return response()->json($users);
    });

    Route::post('users', function (Request $request) {
        $validated = $request->validate([
            'fullname' => ['required_without_all:username,name', 'string', 'max:255'],
            'username' => ['required_without_all:fullname,name', 'string', 'max:255'],
            'name' => ['nullable', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6'],
            'phone' => ['nullable', 'string', 'max:255'],
            'role' => ['nullable', 'string', 'max:50'],
            'hire_date' => ['nullable', 'date'],
            'status' => ['nullable', 'in:active,inactive,on-leave,terminated'],
            'avatar' => ['nullable', 'image', 'max:5120'],
        ]);

        if ($request->hasFile('avatar')) {
            $validated['avatar'] = $request->file('avatar')->store('avatars', 'public');
        }

        $fullname = trim((string) ($validated['fullname'] ?? $validated['username'] ?? $validated['name'] ?? ''));
        $username = trim((string) ($validated['username'] ?? $validated['name'] ?? $fullname));

        $validated['fullname'] = $fullname;
        $validated['username'] = $username;
        unset($validated['name']);
        $validated['password'] = Hash::make($validated['password']);

        $user = User::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'User created successfully',
            'user' => $user,
        ]);
    });

    Route::get('users/{user}', function (User $user) {
        return response()->json($user);
    });

    Route::put('users/{user}', function (Request $request, User $user) {
        $validated = $request->validate([
            'fullname' => ['required_without_all:username,name', 'string', 'max:255'],
            'username' => ['required_without_all:fullname,name', 'string', 'max:255'],
            'name' => ['nullable', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email,'.$user->id],
            'password' => ['nullable', 'string', 'min:6'],
            'phone' => ['nullable', 'string', 'max:255'],
            'role' => ['nullable', 'string', 'max:50'],
            'hire_date' => ['nullable', 'date'],
            'status' => ['nullable', 'in:active,inactive,on-leave,terminated'],
            'avatar' => ['nullable', 'image', 'max:5120'],
        ]);

        if ($request->hasFile('avatar')) {
            if ($user->avatar && Storage::disk('public')->exists($user->avatar)) {
                Storage::disk('public')->delete($user->avatar);
            }
            $validated['avatar'] = $request->file('avatar')->store('avatars', 'public');
        }

        $fullname = trim((string) ($validated['fullname'] ?? $validated['username'] ?? $validated['name'] ?? ''));
        $username = trim((string) ($validated['username'] ?? $validated['name'] ?? $fullname));

        $validated['fullname'] = $fullname;
        $validated['username'] = $username;
        unset($validated['name']);

        if (! empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $user->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'User updated successfully',
            'user' => $user,
        ]);
    });

    Route::delete('users/{user}', function (User $user) {
        if ($user->avatar && Storage::disk('public')->exists($user->avatar)) {
            Storage::disk('public')->delete($user->avatar);
        }

        $user->delete();

        return response()->json([
            'success' => true,
            'message' => 'User deleted successfully',
        ]);
    });

    Route::post('users/bulk-update-status', function (Request $request) {
        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['integer'],
            'status' => ['required', 'in:active,inactive,on-leave,terminated'],
        ]);

        User::whereIn('id', $validated['ids'])->update(['status' => $validated['status']]);

        return response()->json([
            'success' => true,
            'message' => 'User status updated successfully',
        ]);
    });

    Route::post('users/bulk-delete', function (Request $request) {
        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['integer'],
        ]);

        $users = User::whereIn('id', $validated['ids'])->get();
        foreach ($users as $user) {
            if ($user->avatar && Storage::disk('public')->exists($user->avatar)) {
                Storage::disk('public')->delete($user->avatar);
            }
        }

        User::whereIn('id', $validated['ids'])->delete();

        return response()->json([
            'success' => true,
            'message' => 'Users deleted successfully',
        ]);
    });

    // Account Routes
    Route::get('accounts', [\App\Http\Controllers\Backend\Accounting\AccountsController::class, 'index']);
    Route::get('accounts/tree', [\App\Http\Controllers\Backend\Accounting\AccountsController::class, 'tree']);
    Route::get('accounts/valid-parents', [\App\Http\Controllers\Backend\Accounting\AccountsController::class, 'validParents']);
    Route::post('accounts', [\App\Http\Controllers\Backend\Accounting\AccountsController::class, 'store']);
    Route::get('accounts/{account}', [\App\Http\Controllers\Backend\Accounting\AccountsController::class, 'show']);
    Route::put('accounts/{account}', [\App\Http\Controllers\Backend\Accounting\AccountsController::class, 'update']);
    Route::delete('accounts/{account}', [\App\Http\Controllers\Backend\Accounting\AccountsController::class, 'destroy']);
    Route::patch('accounts/{account}/stop', [\App\Http\Controllers\Backend\Accounting\AccountsController::class, 'stop']);

    // Journal Routes
    Route::get('journals/next-code', [\App\Http\Controllers\Backend\Accounting\JournalController::class, 'nextCode']);
    Route::get('journals/export', [\App\Http\Controllers\Backend\Accounting\JournalController::class, 'export'])->name('journals.export');
    Route::get('journals', [\App\Http\Controllers\Backend\Accounting\JournalController::class, 'index']);
    Route::post('journals', [\App\Http\Controllers\Backend\Accounting\JournalController::class, 'store']);
    Route::post('journals/bulk-import', [\App\Http\Controllers\Backend\Accounting\JournalController::class, 'bulkImport'])->name('admin.journals.bulkImport');
    Route::get('journals/{entryCode}', [\App\Http\Controllers\Backend\Accounting\JournalController::class, 'show']);
    Route::put('journals/{entryCode}', [\App\Http\Controllers\Backend\Accounting\JournalController::class, 'update']);
    Route::delete('journals/{entryCode}', [\App\Http\Controllers\Backend\Accounting\JournalController::class, 'destroy']);

    // Financial Reports Routes
    Route::get('financial-reports', [\App\Http\Controllers\Backend\Accounting\FinancialReportController::class, 'getData']);
    Route::get('financial-reports/inventory-valuation-summary', [\App\Http\Controllers\Backend\Accounting\FinancialReportController::class, 'getInventoryValuationSummaryData']);
    Route::get('reports/general-ledger', [\App\Http\Controllers\Backend\Accounting\FinancialReportController::class, 'getGeneralLedgerData']);
    Route::get('reports/trial-balance', [\App\Http\Controllers\Backend\Accounting\FinancialReportController::class, 'getTrialBalanceData']);
    Route::get('reports/balance-sheet', [\App\Http\Controllers\Backend\Accounting\FinancialReportController::class, 'getBalanceSheetData']);
    Route::get('reports/profit-loss', [\App\Http\Controllers\Backend\Accounting\FinancialReportController::class, 'getProfitLossData']);
    Route::get('reports/profit-loss-class', [\App\Http\Controllers\Backend\Accounting\FinancialReportController::class, 'getProfitLossByClassData']);
    Route::get('reports/profit-loss-customer', [\App\Http\Controllers\Backend\Accounting\FinancialReportController::class, 'getProfitLossByCustomerData']);
    Route::get('reports/profit-loss-month', [\App\Http\Controllers\Backend\Accounting\FinancialReportController::class, 'getProfitLossByMonthData']);
    Route::get('reports/profit-loss-comparison', [\App\Http\Controllers\Backend\Accounting\FinancialReportController::class, 'getProfitLossComparisonData']);
    Route::get('reports/profit-loss-detail', [\App\Http\Controllers\Backend\Accounting\FinancialReportController::class, 'getProfitLossDetailData']);
    Route::get('reports/cash-flow', [\App\Http\Controllers\Backend\Accounting\FinancialReportController::class, 'getCashFlowData']);
    Route::post('reports/post-journal', [\App\Http\Controllers\Backend\Accounting\FinancialReportController::class, 'postJournalToPostings']);
    Route::post('reports/unpost-journal', [\App\Http\Controllers\Backend\Accounting\FinancialReportController::class, 'unpostJournalFromPostings']);
    Route::post('reports/favorite', [\App\Http\Controllers\Backend\Accounting\FinancialReportController::class, 'toggleFavorite']);

    // Branch Routes
    Route::get('branches', [\App\Http\Controllers\Backend\Essential_Data_Controllers\BranchController::class, 'getBranches']);

    // Location API Routes for Dependent Dropdowns
    Route::get('countries', [LocationController::class, 'getCountries']);
    Route::get('cities', [LocationController::class, 'getCities']);
    Route::get('areas', [LocationController::class, 'getAreas']);

    Route::get('departments', function () {
        return Department::where('is_active', true)
            ->select('id', 'name_en', 'name_ar')
            ->orderBy('name_en')
            ->get();
    });

    Route::get('professions', function (Request $request) {
        $query = Profession::query()->select('id', 'profession_name', 'profession_code', 'category', 'status');
        if ($request->filled('department_id')) {
            $query->where('category', (int) $request->input('department_id'));
        }
        return $query->orderBy('profession_name')->get();
    });

    // Dashboard Statistics and Activity
    Route::get('/dashboard/stats', function () {
        return response()->json([
            'totalUsers' => 124,
            'totalOrders' => 56,
            'totalRevenue' => 12450,
            'totalProducts' => 89,
        ]);
    });

    Route::get('/dashboard/activity', function () {
        return response()->json([
            [
                'id' => 1,
                'action' => 'New user registered',
                'user' => 'John Doe',
                'time' => '2 minutes ago',
            ],
            [
                'id' => 2,
                'action' => 'Order placed',
                'user' => 'Jane Smith',
                'time' => '15 minutes ago',
            ],
            [
                'id' => 3,
                'action' => 'Product updated',
                'user' => 'Admin',
                'time' => '1 hour ago',
            ],
            [
                'id' => 4,
                'action' => 'Payment received',
                'user' => 'Mike Johnson',
                'time' => '3 hours ago',
            ],
        ]);
    });
});

// For now, we'll return sample vacation data
Route::get('/vacations', function () {
    return response()->json([
        [
            'id' => 1,
            'employeeId' => 1,
            'employeeName' => 'Ahmed Mohamed',
            'department' => 'IT Department',
            'leaveType' => 'annual',
            'startDate' => '2024-12-15',
            'endDate' => '2024-12-22',
            'totalDays' => 8,
            'status' => 'approved',
            'approvedBy' => 'HR Manager',
            'reason' => 'Family vacation',
            'notes' => 'Will be available on emergency phone',
            'emergencyContact' => 'Wife: +20123456789',
            'handoverTo' => 'Sarah Johnson',
            'submittedDate' => '2024-12-01',
            'attachment' => null,
        ],
        [
            'id' => 2,
            'employeeId' => 2,
            'employeeName' => 'Sarah Johnson',
            'department' => 'Human Resources',
            'leaveType' => 'maternity',
            'startDate' => '2024-12-10',
            'endDate' => '2025-03-10',
            'totalDays' => 90,
            'status' => 'approved',
            'approvedBy' => 'HR Manager',
            'reason' => 'Maternity leave',
            'notes' => 'Extended leave as per company policy',
            'emergencyContact' => 'Husband: +20987654321',
            'handoverTo' => 'James Wilson',
            'submittedDate' => '2024-11-15',
            'attachment' => null,
        ],
        [
            'id' => 3,
            'employeeId' => 3,
            'employeeName' => 'James Wilson',
            'department' => 'Sales',
            'leaveType' => 'sick',
            'startDate' => '2024-12-20',
            'endDate' => '2024-12-27',
            'totalDays' => 8,
            'status' => 'pending',
            'approvedBy' => '',
            'reason' => 'Medical appointment',
            'notes' => "Doctor's appointment scheduled",
            'emergencyContact' => 'Spouse: +20555555555',
            'handoverTo' => 'Fatima Al-Mansour',
            'submittedDate' => '2024-12-15',
            'attachment' => null,
        ],
    ]);
});

Route::prefix('pages')->group(function () {
    Route::get('/', function (Request $request) {
        $total = 50;
        $items = [];
        for ($i = 1; $i <= $total; $i++) {
            $items[] = [
                'id' => $i,
                'name' => 'Page '.$i,
                'template' => $i % 3 === 0 ? 'Default' : ($i % 3 === 1 ? 'Blog' : 'Custom'),
                'createdAt' => date('Y-m-d', time() - rand(0, 30) * 86400),
                'status' => $i % 4 === 0 ? 'Draft' : 'Published',
            ];
        }
        $perPage = (int) ($request->get('per_page', 10));
        $page = (int) ($request->get('page', 1));
        $startIndex = max(0, ($page - 1) * $perPage);
        $slice = array_slice($items, $startIndex, $perPage);

        return response()->json([
            'data' => $slice,
            'total' => $total,
            'current_page' => $page,
            'per_page' => $perPage,
        ]);
    });
});

// For now, we'll return sample reward data
Route::get('/rewards', function () {
    return response()->json([
        [
            'id' => 1,
            'employeeId' => 1,
            'employeeName' => 'Ahmed Mohamed',
            'position' => 'Software Engineer',
            'rewardType' => 'bonus',
            'rewardValue' => 2500,
            'category' => 'performance',
            'awardDate' => '2024-01-15',
            'status' => 'completed',
            'badge' => 'star_performer',
            'reason' => 'Outstanding Q4 performance, exceeded all targets by 25%',
            'awardedBy' => 'CTO',
            'points' => 100,
            'notes' => 'Quarterly performance bonus',
            'createdAt' => '2024-01-15',
        ],
        [
            'id' => 2,
            'employeeId' => 2,
            'employeeName' => 'Sarah Johnson',
            'position' => 'HR Manager',
            'rewardType' => 'award',
            'rewardValue' => 0,
            'category' => 'leadership',
            'awardDate' => '2024-01-10',
            'status' => 'active',
            'badge' => 'leadership',
            'reason' => 'Employee of the Month for exceptional HR initiatives',
            'awardedBy' => 'CEO',
            'points' => 150,
            'notes' => '',
            'createdAt' => '2024-01-10',
        ],
        [
            'id' => 3,
            'employeeId' => 3,
            'employeeName' => 'James Wilson',
            'position' => 'Sales Director',
            'rewardType' => 'bonus',
            'rewardValue' => 5000,
            'category' => 'sales',
            'awardDate' => '2024-01-05',
            'status' => 'completed',
            'badge' => '',
            'reason' => 'Record-breaking sales quarter, exceeded target by 40%',
            'awardedBy' => 'Sales VP',
            'points' => 200,
            'notes' => 'Annual sales bonus',
            'createdAt' => '2024-01-05',
        ],
    ]);
});
