<?php

namespace App\Http\Controllers\Backend\Tasks;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTaskAttachmentRequest;
use App\Http\Requests\UpdateTaskAttachmentRequest;
use App\Models\Tasks\Task;
use App\Models\Tasks\TaskAttachment;
use Illuminate\Support\Facades\Auth;

class TaskAttachmentController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth');
    }

    public function index()
    {
        return TaskAttachment::with('task')->get();
    }

    public function store(StoreTaskAttachmentRequest $request)
    {
        $task = Task::find($request->task_id);

        if (! $task) {
            return response()->json(['error' => 'Task not found'], 404);
        }

        $userId = Auth::id();
        $canAttach = $task->created_by === $userId || $task->assignments()->where('user_id', $userId)->exists();

        if (! $canAttach) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $attachment = TaskAttachment::create($request->validated());

        return response()->json($attachment->load('task'), 201);
    }

    public function show(TaskAttachment $taskAttachment)
    {
        return $taskAttachment->load('task');
    }

    public function update(UpdateTaskAttachmentRequest $request, TaskAttachment $taskAttachment)
    {
        $taskAttachment->load('task');

        if ($taskAttachment->task->created_by !== Auth::id()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $taskAttachment->update($request->validated());

        return response()->json($taskAttachment->load('task'));
    }

    public function destroy(TaskAttachment $taskAttachment)
    {
        $taskAttachment->load('task');

        if ($taskAttachment->task->created_by !== Auth::id()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $taskAttachment->delete();

        return response()->json(['message' => 'Task attachment deleted']);
    }
}
