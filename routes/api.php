<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
use App\Http\Controllers\Tasks\TaskController;
use App\Http\Controllers\Tasks\TaskAssignmentController;
use App\Http\Controllers\Tasks\TaskAttachmentController;
use App\Http\Controllers\Tasks\TaskCategoryController;
use App\Http\Controllers\Tasks\TaskCommentController;
use App\Http\Controllers\Tasks\TaskPriorityController;
use App\Http\Controllers\Tasks\TaskStatusController;
use App\Http\Controllers\HumanResource\EmployeeController;
use App\Http\Controllers\Location\LocationController;

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
    Route::apiResource('tasks', TaskController::class);
    Route::apiResource('assignments', TaskAssignmentController::class);
    Route::apiResource('attachments', TaskAttachmentController::class);
    Route::apiResource('comments', TaskCommentController::class);
    Route::get('tasks/categories', [TaskCategoryController::class, 'index']);
    Route::get('tasks/priorities', [TaskPriorityController::class, 'index']);
    Route::get('tasks/statuses', [TaskStatusController::class, 'index']);
    Route::get('tasks/statistics', [TaskController::class, 'statistics']);
    Route::get('employees', [EmployeeController::class, 'index']);
    Route::get('accounts', [\App\Http\Controllers\Accounting\AccountsController::class, 'index']);
});

// For now, we'll return sample vacation data
Route::get('/vacations', function () {
    return response()->json([
        [
            'id' => 1,
            'employeeId' => 1,
            'employeeName' => "Ahmed Mohamed",
            'department' => "IT Department",
            'leaveType' => "annual",
            'startDate' => "2024-12-15",
            'endDate' => "2024-12-22",
            'totalDays' => 8,
            'status' => "approved",
            'approvedBy' => "HR Manager",
            'reason' => "Family vacation",
            'notes' => "Will be available on emergency phone",
            'emergencyContact' => "Wife: +20123456789",
            'handoverTo' => "Sarah Johnson",
            'submittedDate' => "2024-12-01",
            'attachment' => null,
        ],
        [
            'id' => 2,
            'employeeId' => 2,
            'employeeName' => "Sarah Johnson",
            'department' => "Human Resources",
            'leaveType' => "maternity",
            'startDate' => "2024-12-10",
            'endDate' => "2025-03-10",
            'totalDays' => 90,
            'status' => "approved",
            'approvedBy' => "HR Manager",
            'reason' => "Maternity leave",
            'notes' => "Extended leave as per company policy",
            'emergencyContact' => "Husband: +20987654321",
            'handoverTo' => "James Wilson",
            'submittedDate' => "2024-11-15",
            'attachment' => null,
        ],
        [
            'id' => 3,
            'employeeId' => 3,
            'employeeName' => "James Wilson",
            'department' => "Sales",
            'leaveType' => "sick",
            'startDate' => "2024-12-20",
            'endDate' => "2024-12-27",
            'totalDays' => 8,
            'status' => "pending",
            'approvedBy' => "",
            'reason' => "Medical appointment",
            'notes' => "Doctor's appointment scheduled",
            'emergencyContact' => "Spouse: +20555555555",
            'handoverTo' => "Fatima Al-Mansour",
            'submittedDate' => "2024-12-15",
            'attachment' => null,
        ]
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
            'createdAt' => '2024-01-15'
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
            'createdAt' => '2024-01-10'
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
            'createdAt' => '2024-01-05'
        ]
    ]);
});
