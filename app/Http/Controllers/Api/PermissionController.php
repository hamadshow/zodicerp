<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PermissionService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class PermissionController extends BaseApiController
{
    protected PermissionService $permissionService;

    public function __construct(PermissionService $permissionService)
    {
        $this->permissionService = $permissionService;
    }

    /**
     * Display a listing of permissions.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $filters = $request->only(['search', 'group', 'status']);
            $perPage = $request->get('per_page', 15);
            $sortBy = $request->get('sort_by', 'created_at');
            $sortDirection = $request->get('sort_direction', 'desc');

            $permissions = $this->permissionService->getAll($filters, $perPage, $sortBy, $sortDirection);

            return $this->successResponse($permissions, 'Permissions retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to retrieve permissions', 500);
        }
    }

    /**
     * Store a newly created permission.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255|unique:permissions,name',
            'display_name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'group' => 'nullable|string|max:100',
            'status' => 'required|in:active,inactive',
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        try {
            $permission = $this->permissionService->create($request->all());
            return $this->successResponse($permission, 'Permission created successfully', 201);
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to create permission', 500);
        }
    }

    /**
     * Display the specified permission.
     */
    public function show(int $id): JsonResponse
    {
        try {
            $permission = $this->permissionService->find($id);

            if (!$permission) {
                return $this->notFoundResponse('Permission not found');
            }

            return $this->successResponse($permission, 'Permission retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to retrieve permission', 500);
        }
    }

    /**
     * Update the specified permission.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255|unique:permissions,name,' . $id,
            'display_name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'group' => 'nullable|string|max:100',
            'status' => 'sometimes|required|in:active,inactive',
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        try {
            $permission = $this->permissionService->update($id, $request->all());

            if (!$permission) {
                return $this->notFoundResponse('Permission not found');
            }

            return $this->successResponse($permission, 'Permission updated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to update permission', 500);
        }
    }

    /**
     * Remove the specified permission.
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            $deleted = $this->permissionService->delete($id);

            if (!$deleted) {
                return $this->notFoundResponse('Permission not found');
            }

            return $this->successResponse(null, 'Permission deleted successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to delete permission', 500);
        }
    }
}