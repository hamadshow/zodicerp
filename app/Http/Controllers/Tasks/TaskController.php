<?php

namespace App\Http\Controllers\Tasks;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\TaskStatus;
use App\Http\Requests\StoreTaskRequest;
use App\Http\Requests\UpdateTaskRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TaskController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth');
    }

    public function index(Request $request)
    {
        $query = Task::with(['category', 'priority', 'status', 'creator', 'assignments.user']);

        // Search functionality
        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhereHas('category', function ($subQ) use ($search) {
                      $subQ->where('name', 'like', "%{$search}%");
                  })
                  ->orWhereHas('creator', function ($subQ) use ($search) {
                      $subQ->where('name', 'like', "%{$search}%");
                  });
            });
        }

        // Filters
        if ($request->has('status_id') && !empty($request->status_id)) {
            $query->where('status_id', $request->status_id);
        }

        if ($request->has('priority_id') && !empty($request->priority_id)) {
            $query->where('priority_id', $request->priority_id);
        }

        if ($request->has('category_id') && !empty($request->category_id)) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->has('assignee_id') && !empty($request->assignee_id)) {
            $query->whereHas('assignments', function ($q) use ($request) {
                $q->where('user_id', $request->assignee_id);
            });
        }

        // Pagination
        $perPage = $request->get('per_page', 10);
        $tasks = $query->paginate($perPage);

        return response()->json($tasks);
    }

    public function store(StoreTaskRequest $request)
    {
        $task = Task::create([
            'title' => $request->title,
            'description' => $request->description,
            'category_id' => $request->category_id,
            'priority_id' => $request->priority_id,
            'status_id' => $request->status_id,
            'created_by' => Auth::id(),
            'due_date' => $request->due_date,
        ]);

        return response()->json($task->load(['category', 'priority', 'status', 'creator']), 201);
    }

    public function show(Task $task)
    {
        return $task->load(['category', 'priority', 'status', 'creator', 'assignments.user', 'comments.user', 'attachments']);
    }

    public function update(UpdateTaskRequest $request, Task $task)
    {
        // Authorization: only creator can update
        if ($task->created_by !== Auth::id()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $task->update($request->validated());

        return response()->json($task->load(['category', 'priority', 'status', 'creator']));
    }

    public function destroy(Task $task)
    {
        if ($task->created_by !== Auth::id()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $task->delete();

        return response()->json(['message' => 'Task deleted']);
    }

    public function statistics()
    {
        $totalTasks = Task::count();
        $pendingTasks = Task::whereHas('status', function ($q) {
            $q->where('name', 'Pending');
        })->count();
        $completedTasks = Task::whereHas('status', function ($q) {
            $q->where('name', 'Completed');
        })->count();
        $overdueTasks = Task::where('due_date', '<', now())
            ->whereHas('status', function ($q) {
                $q->where('name', '!=', 'Completed');
            })->count();

        return response()->json([
            'total_tasks' => $totalTasks,
            'pending_tasks' => $pendingTasks,
            'completed_tasks' => $completedTasks,
            'overdue_tasks' => $overdueTasks,
        ]);
    }
}