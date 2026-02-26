<?php

namespace App\Http\Controllers\Backend\Tasks;

use App\Models\Tasks\TaskPriority;
use App\Http\Requests\StoreTaskPriorityRequest;
use App\Http\Requests\UpdateTaskPriorityRequest;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;

class TaskPriorityController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth');
    }

    public function index()
    {
        return TaskPriority::all();
    }

    public function store(StoreTaskPriorityRequest $request)
    {
        $priority = TaskPriority::create($request->validated());

        return response()->json($priority, 201);
    }

    public function show(TaskPriority $taskPriority)
    {
        return $taskPriority->load('tasks');
    }

    public function update(UpdateTaskPriorityRequest $request, TaskPriority $taskPriority)
    {
        $taskPriority->update($request->validated());

        return response()->json($taskPriority);
    }

    public function destroy(TaskPriority $taskPriority)
    {
        $taskPriority->delete();

        return response()->json(['message' => 'Task priority deleted']);
    }
}