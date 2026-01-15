<?php

namespace App\Http\Controllers\Purchases;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use App\Models\Products;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use App\Http\Requests\Purchases\StoreSupplierRequest;
use App\Http\Requests\Purchases\UpdateSupplierRequest;
use Illuminate\Support\Facades\DB;

class SupplierManagementController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth');
    }

    public function index(): Response
    {
        return Inertia::render('Backend/04-Purchases/Suppliers');
    }

    public function profile(Supplier $supplier): Response
    {
        $supplier->load('products');
        return Inertia::render('Backend/04-Purchases/SupplierProfile', [
            'supplier' => $supplier,
            'products' => Products::select('id', 'name', 'product_code')->get()
        ]);
    }

    public function getSuppliers(Request $request)
    {
        $query = Supplier::query();

        // Apply search filter
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('supplier_name', 'like', "%{$search}%")
                  ->orWhere('company_name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        // Apply status filter
        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        $suppliers = $query->orderBy('created_at', 'desc')->paginate($request->get('per_page', 10));

        return response()->json($suppliers);
    }

    public function store(StoreSupplierRequest $request)
    {
        $validated = $request->validated();

        // Default password for admin-created suppliers
        $validated['password'] = Hash::make('password');

        $supplier = Supplier::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Supplier created successfully',
            'supplier' => $supplier
        ]);
    }

    public function show(Supplier $supplier)
    {
        return response()->json($supplier->load('products'));
    }

    public function update(UpdateSupplierRequest $request, Supplier $supplier)
    {
        $validated = $request->validated();

        $supplier->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Supplier updated successfully',
            'supplier' => $supplier
        ]);
    }

    public function destroy(Supplier $supplier)
    {
        $supplier->delete();

        return response()->json([
            'success' => true,
            'message' => 'Supplier deleted successfully'
        ]);
    }

    public function bulkUpdateStatus(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'integer',
            'status' => 'required|in:active,inactive',
        ]);

        Supplier::whereIn('id', $validated['ids'])->update(['status' => $validated['status']]);

        return response()->json([
            'success' => true,
            'message' => 'Suppliers status updated successfully'
        ]);
    }

    public function bulkDelete(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'integer',
        ]);

        Supplier::whereIn('id', $validated['ids'])->delete();

        return response()->json([
            'success' => true,
            'message' => 'Suppliers deleted successfully'
        ]);
    }

    public function import(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:2048',
        ]);

        $file = $request->file('file');
        $csvData = array_map('str_getcsv', file($file->getRealPath()));
        $header = array_shift($csvData); // Assuming first row is header

        // Basic CSV parsing - mapping by index assuming order: Name, Email, Phone, Company, Status
        // Or just creating dummy suppliers for now if structure varies
        // Better: Try to map by header names if possible, or just strict index.
        
        $count = 0;
        foreach ($csvData as $row) {
            if (count($row) < 3) continue; // Skip invalid rows

            try {
                // Check if email exists
                if (Supplier::where('email', $row[1])->exists()) continue;

                Supplier::create([
                    'supplier_name' => $row[0] ?? 'Unknown',
                    'email' => $row[1] ?? 'noemail@example.com',
                    'phone' => $row[2] ?? '',
                    'company_name' => $row[3] ?? '',
                    'status' => 'active', // Default
                    'password' => Hash::make('password'),
                ]);
                $count++;
            } catch (\Exception $e) {
                // Skip error rows
                continue;
            }
        }

        return response()->json([
            'success' => true,
            'message' => "$count suppliers imported successfully"
        ]);
    }

    public function assignProducts(Request $request, Supplier $supplier)
    {
        $request->validate([
            'product_ids' => 'array',
            'product_ids.*' => 'integer|exists:products,id',
        ]);

        // Assuming pivot table 'product_supplier' exists or similar relationship
        // If not, I should check if relationship is defined in Supplier model.
        // If 'products' relationship exists in Supplier model (implied by $supplier->load('products')), 
        // then sync() should work if it's BelongsToMany.
        
        try {
            $supplier->products()->sync($request->product_ids);
            
            return response()->json([
                'success' => true,
                'message' => 'Products assigned successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error assigning products: ' . $e->getMessage()
            ], 500);
        }
    }
}
