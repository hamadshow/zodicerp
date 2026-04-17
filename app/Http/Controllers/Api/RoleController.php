<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\RoleService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class RoleController extends BaseApiController
{
    protected RoleService $roleService;

    public function __construct(RoleService $roleService)
    {
        $this->roleService = $roleService;
    }

    /**
     * Display a listing of roles.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $filters = $request->only(['search', 'status']);
            $perPage = $request->get('per_page', 15);
            $sortBy = $request->get('sort_by', 'created_at');
            $sortDirection = $request->get('sort_direction', 'desc');

            $roles = $this->roleService->getAll($filters, $perPage, $sortBy, $sortDirection);

            return $this->successResponse($roles, 'Roles retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to retrieve roles', 500);
        }
    }

    /**
     * Store a newly created role.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255|unique:roles,name',
            'display_name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'required|in:active,inactive',
            'permissions' => 'nullable|array',
            'permissions.*' => 'exists:permissions,id',
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        try {
            $role = $this->roleService->create($request->all());
            return $this->successResponse($role, 'Role created successfully', 201);
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to create role', 500);
        }
    }

    /**
     * Display the specified role.
     */
    public function show(int $id): JsonResponse
    {
        try {
            $role = $this->roleService->find($id);

            if (!$role) {
                return $this->notFoundResponse('Role not found');
            }

            return $this->successResponse($role, 'Role retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to retrieve role', 500);
        }
    }

    /**
     * Update the specified role.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255|unique:roles,name,' . $id,
            'display_name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'sometimes|required|in:active,inactive',
            'permissions' => 'nullable|array',
            'permissions.*' => 'exists:permissions,id',
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        try {
            $role = $this->roleService->update($id, $request->all());

            if (!$role) {
                return $this->notFoundResponse('Role not found');
            }

            return $this->successResponse($role, 'Role updated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to update role', 500);
        }
    }

    /**
     * Remove the specified role.
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            $deleted = $this->roleService->delete($id);

            if (!$deleted) {
                return $this->notFoundResponse('Role not found');
            }

            return $this->successResponse(null, 'Role deleted successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to delete role', 500);
        }
    }

    /**
     * Assign permission to role.
     */
    public function assignPermission(Request $request, int $roleId): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'permission_id' => 'required|exists:permissions,id',
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        try {
            $result = $this->roleService->assignPermission($roleId, $request->permission_id);

            if (!$result) {
                return $this->notFoundResponse('Role not found');
            }

            return $this->successResponse(null, 'Permission assigned to role successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to assign permission to role', 500);
        }
    }

    /**
     * Remove permission from role.
     */
    public function removePermission(Request $request, int $roleId): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'permission_id' => 'required|exists:permissions,id',
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        try {
            $result = $this->roleService->removePermission($roleId, $request->permission_id);

            if (!$result) {
                return $this->notFoundResponse('Role not found');
            }

            return $this->successResponse(null, 'Permission removed from role successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to remove permission from role', 500);
        }
    }
}