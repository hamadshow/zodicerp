<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\OrderService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class OrderController extends BaseApiController
{
    protected OrderService $orderService;

    public function __construct(OrderService $orderService)
    {
        $this->orderService = $orderService;
    }

    /**
     * Display a listing of orders.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $filters = $request->only(['search', 'status', 'customer_id', 'date_from', 'date_to', 'min_total', 'max_total']);
            $perPage = $request->get('per_page', 15);
            $sortBy = $request->get('sort_by', 'created_at');
            $sortDirection = $request->get('sort_direction', 'desc');

            $orders = $this->orderService->getAll($filters, $perPage, $sortBy, $sortDirection);

            return $this->successResponse($orders, 'Orders retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to retrieve orders', 500);
        }
    }

    /**
     * Store a newly created order.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'customer_id' => 'nullable|exists:users,id',
            'customer_name' => 'required|string|max:255',
            'customer_email' => 'required|email|max:255',
            'customer_phone' => 'nullable|string|max:20',
            'shipping_address' => 'required|array',
            'shipping_address.street' => 'required|string',
            'shipping_address.city' => 'required|string',
            'shipping_address.state' => 'nullable|string',
            'shipping_address.country' => 'required|string',
            'shipping_address.postal_code' => 'nullable|string',
            'billing_address' => 'nullable|array',
            'billing_address.street' => 'nullable|string',
            'billing_address.city' => 'nullable|string',
            'billing_address.state' => 'nullable|string',
            'billing_address.country' => 'nullable|string',
            'billing_address.postal_code' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.price' => 'required|numeric|min:0',
            'items.*.discount' => 'nullable|numeric|min:0',
            'shipping_method' => 'nullable|string|max:100',
            'shipping_cost' => 'nullable|numeric|min:0',
            'tax_amount' => 'nullable|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
            'payment_method' => 'nullable|string|max:50',
            'status' => 'required|in:pending,processing,shipped,delivered,cancelled,refunded',
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        try {
            $order = $this->orderService->create($request->all());
            return $this->successResponse($order, 'Order created successfully', 201);
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to create order', 500);
        }
    }

    /**
     * Display the specified order.
     */
    public function show(int $id): JsonResponse
    {
        try {
            $order = $this->orderService->find($id);

            if (!$order) {
                return $this->notFoundResponse('Order not found');
            }

            return $this->successResponse($order, 'Order retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to retrieve order', 500);
        }
    }

    /**
     * Update the specified order.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'customer_id' => 'nullable|exists:users,id',
            'customer_name' => 'sometimes|required|string|max:255',
            'customer_email' => 'sometimes|required|email|max:255',
            'customer_phone' => 'nullable|string|max:20',
            'shipping_address' => 'sometimes|required|array',
            'shipping_address.street' => 'sometimes|required|string',
            'shipping_address.city' => 'sometimes|required|string',
            'shipping_address.state' => 'nullable|string',
            'shipping_address.country' => 'sometimes|required|string',
            'shipping_address.postal_code' => 'nullable|string',
            'billing_address' => 'nullable|array',
            'billing_address.street' => 'nullable|string',
            'billing_address.city' => 'nullable|string',
            'billing_address.state' => 'nullable|string',
            'billing_address.country' => 'nullable|string',
            'billing_address.postal_code' => 'nullable|string',
            'items' => 'sometimes|required|array|min:1',
            'items.*.product_id' => 'sometimes|required|exists:products,id',
            'items.*.quantity' => 'sometimes|required|integer|min:1',
            'items.*.price' => 'sometimes|required|numeric|min:0',
            'items.*.discount' => 'nullable|numeric|min:0',
            'shipping_method' => 'nullable|string|max:100',
            'shipping_cost' => 'nullable|numeric|min:0',
            'tax_amount' => 'nullable|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
            'payment_method' => 'nullable|string|max:50',
            'status' => 'sometimes|required|in:pending,processing,shipped,delivered,cancelled,refunded',
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        try {
            $order = $this->orderService->update($id, $request->all());

            if (!$order) {
                return $this->notFoundResponse('Order not found');
            }

            return $this->successResponse($order, 'Order updated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to update order', 500);
        }
    }

    /**
     * Remove the specified order.
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            $deleted = $this->orderService->delete($id);

            if (!$deleted) {
                return $this->notFoundResponse('Order not found');
            }

            return $this->successResponse(null, 'Order deleted successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to delete order', 500);
        }
    }

    /**
     * Update order status.
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'status' => 'required|in:pending,processing,shipped,delivered,cancelled,refunded',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        try {
            $order = $this->orderService->updateStatus($id, $request->status, $request->notes);

            if (!$order) {
                return $this->notFoundResponse('Order not found');
            }

            return $this->successResponse($order, 'Order status updated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to update order status', 500);
        }
    }

    /**
     * Bulk delete orders.
     */
    public function bulkDelete(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer|exists:orders,id',
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        try {
            $deleted = $this->orderService->bulkDelete($request->ids);
            return $this->successResponse(['deleted_count' => $deleted], 'Orders deleted successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to delete orders', 500);
        }
    }

    /**
     * Bulk update order status.
     */
    public function bulkUpdateStatus(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer|exists:orders,id',
            'status' => 'required|in:pending,processing,shipped,delivered,cancelled,refunded',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        try {
            $updated = $this->orderService->bulkUpdateStatus($request->ids, $request->status, $request->notes);
            return $this->successResponse(['updated_count' => $updated], 'Order status updated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to update order status', 500);
        }
    }
}