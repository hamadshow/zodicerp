<?php

namespace App\Http\Controllers\Tasks;

use App\Models\TaskStatus;
use App\Http\Requests\StoreTaskStatusRequest;
use App\Http\Requests\UpdateTaskStatusRequest;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;

class TaskStatusController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth');
    }

    public function index()
    {
        return TaskStatus::all();
    }

    public function store(StoreTaskStatusRequest $request)
    {
        $status = TaskStatus::create($request->validated());

        return response()->json($status, 201);
    }

    public function show(TaskStatus $taskStatus)
    {
        return $taskStatus->load('tasks');
    }

    public function update(UpdateTaskStatusRequest $request, TaskStatus $taskStatus)
    {
        $taskStatus->update($request->validated());

        return response()->json($taskStatus);
    }

    public function destroy(TaskStatus $taskStatus)
    {
        $taskStatus->delete();

        return response()->json(['message' => 'Task status deleted']);
    }
}