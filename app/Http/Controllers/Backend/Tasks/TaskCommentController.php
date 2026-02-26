<?php

namespace App\Http\Controllers\Backend\Tasks;

use App\Http\Controllers\Controller;
use App\Models\Tasks\TaskComment;
use App\Models\Tasks\Task;
use App\Http\Requests\StoreTaskCommentRequest;
use App\Http\Requests\UpdateTaskCommentRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TaskCommentController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth');
    }

    public function index()
    {
        return TaskComment::with(['task', 'user'])->get();
    }

    public function store(StoreTaskCommentRequest $request)
    {
        $task = Task::find($request->task_id);
        if (!$task) {
            return response()->json(['error' => 'Task not found'], 404);
        }
        $userId = Auth::id();
        $canComment = $task->created_by === $userId || $task->assignments()->where('user_id', $userId)->exists();

        if (!$canComment) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $comment = TaskComment::create([
            'task_id' => $request->task_id,
            'user_id' => $userId,
            'comment' => $request->comment,
        ]);

        return response()->json($comment->load(['task', 'user']), 201);
    }

    public function show(TaskComment $taskComment)
    {
        return $taskComment->load(['task', 'user']);
    }

    public function update(UpdateTaskCommentRequest $request, TaskComment $taskComment)
    {
        if ($taskComment->user_id !== Auth::id()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $taskComment->update($request->validated());

        return response()->json($taskComment->load(['task', 'user']));
    }

    public function destroy(TaskComment $taskComment)
    {
        if ($taskComment->user_id !== Auth::id()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $taskComment->delete();

        return response()->json(['message' => 'Task comment deleted']);
    }
}