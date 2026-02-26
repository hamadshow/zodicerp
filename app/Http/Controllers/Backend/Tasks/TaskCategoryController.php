<?php

namespace App\Http\Controllers\Backend\Tasks;

use App\Http\Controllers\Controller;
use App\Models\Tasks\TaskCategory;
use App\Http\Requests\StoreTaskCategoryRequest;
use App\Http\Requests\UpdateTaskCategoryRequest;
use Illuminate\Http\Request;

class TaskCategoryController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth');
    }

    public function index()
    {
        return TaskCategory::all();
    }

    public function store(StoreTaskCategoryRequest $request)
    {
        $category = TaskCategory::create($request->validated());

        return response()->json($category, 201);
    }

    public function show(TaskCategory $taskCategory)
    {
        return $taskCategory->load('tasks');
    }

    public function update(UpdateTaskCategoryRequest $request, TaskCategory $taskCategory)
    {
        $taskCategory->update($request->validated());

        return response()->json($taskCategory);
    }

    public function destroy(TaskCategory $taskCategory)
    {
        $taskCategory->delete();

        return response()->json(['message' => 'Task category deleted']);
    }
}