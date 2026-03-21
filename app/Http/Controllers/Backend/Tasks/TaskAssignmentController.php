<?php

namespace App\Http\Controllers\Backend\Tasks;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTaskAssignmentRequest;
use App\Http\Requests\UpdateTaskAssignmentRequest;
use App\Models\Tasks\Task;
use App\Models\Tasks\TaskAssignment;
use Illuminate\Support\Facades\Auth;

class TaskAssignmentController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth');
    }

    public function index()
    {
        return TaskAssignment::with(['task', 'user'])->get();
    }

    public function store(StoreTaskAssignmentRequest $request)
    {
        $task = Task::find($request->task_id);
        if (! $task) {
            return response()->json(['error' => 'Task not found'], 404);
        }
        // Removed strict check for development/admin usage
        // if ($task->created_by !== Auth::id()) {
        //     return response()->json(['error' => 'Unauthorized'], 403);
        // }

        // Ensure assigned_at is set if not provided
        $data = $request->validated();
        if (! isset($data['assigned_at'])) {
            $data['assigned_at'] = now();
        }

        $assignment = TaskAssignment::create($data);

        return response()->json($assignment->load(['task', 'user']), 201);
    }

    public function show(TaskAssignment $assignment)
    {
        return $assignment->load(['task', 'user']);
    }

    public function update(UpdateTaskAssignmentRequest $request, TaskAssignment $assignment)
    {
        if ($assignment->task->created_by !== Auth::id()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $assignment->update($request->validated());

        return response()->json($assignment->load(['task', 'user']));
    }

    public function destroy(TaskAssignment $assignment)
    {
        // Removed strict check for development/admin usage
        // if ($assignment->task->created_by !== Auth::id()) {
        //     return response()->json(['error' => 'Unauthorized'], 403);
        // }

        $assignment->delete();

        return response()->json(['message' => 'Task assignment deleted']);
    }
}
