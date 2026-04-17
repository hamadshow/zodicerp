<?php

namespace App\Http\Controllers\Api;

use App\Services\UserService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class UserController extends BaseApiController
{
    protected UserService $userService;

    public function __construct(UserService $userService)
    {
        $this->userService = $userService;
    }

    /**
     * Get all users
     */
    public function index(Request $request): \Illuminate\Http\JsonResponse
    {
        try {
            $perPage = $request->get('per_page', 15);
            $users = $this->userService->getUsersWithRoles($perPage);
            return $this->paginatedResponse($users, 'Users retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to retrieve users', 500);
        }
    }

    /**
     * Create user
     */
    public function store(Request $request): \Illuminate\Http\JsonResponse
    {
        try {
            $validated = $this->validateRequest($request, [
                'name' => 'required|string|max:255',
                'email' => 'required|email|unique:users,email',
                'password' => 'required|string|min:8',
                'role_id' => 'nullable|exists:roles,id',
                'is_active' => 'boolean',
            ]);

            $user = $this->userService->createUser($validated);
            return $this->successResponse($user, 'User created successfully', 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->validationErrorResponse($e->validator);
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to create user', 500);
        }
    }

    /**
     * Get user by ID
     */
    public function show(int $id): \Illuminate\Http\JsonResponse
    {
        try {
            $user = $this->userService->find($id);

            if (!$user) {
                return $this->errorResponse('User not found', 404);
            }

            return $this->successResponse($user->load('roles'), 'User retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to retrieve user', 500);
        }
    }

    /**
     * Update user
     */
    public function update(Request $request, int $id): \Illuminate\Http\JsonResponse
    {
        try {
            $validated = $this->validateRequest($request, [
                'name' => 'sometimes|string|max:255',
                'email' => 'sometimes|email|unique:users,email,' . $id,
                'password' => 'sometimes|string|min:8',
                'role_id' => 'nullable|exists:roles,id',
                'is_active' => 'boolean',
            ]);

            $user = $this->userService->updateUser($id, $validated);
            return $this->successResponse($user, 'User updated successfully');
        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->validationErrorResponse($e->validator);
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to update user', 500);
        }
    }

    /**
     * Delete user
     */
    public function destroy(int $id): \Illuminate\Http\JsonResponse
    {
        try {
            $deleted = $this->userService->delete($id);

            if (!$deleted) {
                return $this->errorResponse('User not found', 404);
            }

            return $this->successResponse(null, 'User deleted successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to delete user', 500);
        }
    }

    /**
     * Bulk delete users
     */
    public function bulkDelete(Request $request): \Illuminate\Http\JsonResponse
    {
        try {
            $validated = $this->validateRequest($request, [
                'ids' => 'required|array',
                'ids.*' => 'required|integer|exists:users,id',
            ]);

            $count = $this->userService->bulkDelete($validated['ids']);
            return $this->successResponse(['deleted_count' => $count], 'Users deleted successfully');
        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->validationErrorResponse($e->validator);
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to delete users', 500);
        }
    }

    /**
     * Assign role to user
     */
    public function assignRole(Request $request, int $userId): \Illuminate\Http\JsonResponse
    {
        try {
            $validated = $this->validateRequest($request, [
                'role_id' => 'required|integer|exists:roles,id',
            ]);

            $this->userService->assignRole($userId, $validated['role_id']);
            return $this->successResponse(null, 'Role assigned successfully');
        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->validationErrorResponse($e->validator);
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to assign role', 500);
        }
    }

    /**
     * Remove role from user
     */
    public function removeRole(Request $request, int $userId): \Illuminate\Http\JsonResponse
    {
        try {
            $validated = $this->validateRequest($request, [
                'role_id' => 'required|integer|exists:roles,id',
            ]);

            $this->userService->removeRole($userId, $validated['role_id']);
            return $this->successResponse(null, 'Role removed successfully');
        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->validationErrorResponse($e->validator);
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to remove role', 500);
        }
    }

    /**
     * Check user permission
     */
    public function checkPermission(Request $request, int $userId): \Illuminate\Http\JsonResponse
    {
        try {
            $validated = $this->validateRequest($request, [
                'permission' => 'required|string',
            ]);

            $hasPermission = $this->userService->hasPermission($userId, $validated['permission']);
            return $this->successResponse(['has_permission' => $hasPermission]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->validationErrorResponse($e->validator);
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to check permission', 500);
        }
    }
}