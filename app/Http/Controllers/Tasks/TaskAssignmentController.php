<?php

namespace App\Http\Controllers\Tasks;

use App\Http\Controllers\Controller;
use App\Models\TaskAssignment;
use App\Models\Task;
use App\Http\Requests\StoreTaskAssignmentRequest;
use App\Http\Requests\UpdateTaskAssignmentRequest;
use Illuminate\Http\Request;
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
        if (!$task) {
            return response()->json(['error' => 'Task not found'], 404);
        }
        if ($task->created_by !== Auth::id()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $assignment = TaskAssignment::create($request->validated());

        return response()->json($assignment->load(['task', 'user']), 201);
    }

    public function show(TaskAssignment $taskAssignment)
    {
        return $taskAssignment->load(['task', 'user']);
    }

    public function update(UpdateTaskAssignmentRequest $request, TaskAssignment $taskAssignment)
    {
        if ($taskAssignment->task->created_by !== Auth::id()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $taskAssignment->update($request->validated());

        return response()->json($taskAssignment->load(['task', 'user']));
    }

    public function destroy(TaskAssignment $taskAssignment)
    {
        if ($taskAssignment->task->created_by !== Auth::id()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $taskAssignment->delete();

        return response()->json(['message' => 'Task assignment deleted']);
    }
}