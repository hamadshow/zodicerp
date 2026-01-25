<?php

namespace App\Http\Controllers\Client_Sales;

use App\Http\Controllers\Controller;
use App\Models\Client_Sales\CustomerGroup;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class CustomerGroupController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = CustomerGroup::with('parent');

        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name_ar', 'like', "%{$search}%")
                  ->orWhere('name_en', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%");
            });
        }

        $groups = $query->latest()->get();
        $parentGroups = CustomerGroup::whereNull('parent_id')->get();

        if ($request->wantsJson()) {
            return response()->json([
                'groups' => $groups,
                'parentGroups' => $parentGroups
            ]);
        }

        return Inertia::render('Backend/05-Client_Sales/CustomerGroup', [
            'groups' => $groups,
            'parentGroups' => $parentGroups,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'name_ar' => 'required|string|max:100',
            'name_en' => 'nullable|string|max:100',
            'parent_id' => 'nullable|exists:customer_groups,id',
            'account_id' => 'nullable|exists:accounts,AccID',
            'price_list_id' => 'nullable|integer',
            'payment_terms' => 'nullable|integer|min:0',
            'credit_limit' => 'nullable|numeric|min:0',
            'discount_percentage' => 'nullable|numeric|min:0|max:100',
            'notes' => 'nullable|string',
        ]);

        try {
            DB::beginTransaction();

            $code = $this->generateNextCode();

            $group = CustomerGroup::create([
                'code' => $code,
                'name_ar' => $request->name_ar,
                'name_en' => $request->name_en,
                'parent_id' => $request->parent_id,
                'account_id' => $request->account_id,
                'price_list_id' => $request->price_list_id,
                'payment_terms' => $request->payment_terms ?? 30,
                'credit_limit' => $request->credit_limit ?? 0,
                'discount_percentage' => $request->discount_percentage ?? 0,
                'notes' => $request->notes,
                'is_active' => $request->has('is_active') ? $request->is_active : true,
                'created_by' => Auth::id(),
            ]);

            DB::commit();

            if ($request->wantsJson()) {
                return response()->json(['message' => 'Customer Group created successfully', 'data' => $group], 201);
            }

            return redirect()->route('admin.client-sales.customer-groups.index')->with('success', 'Customer Group created successfully');

        } catch (\Exception $e) {
            DB::rollBack();

            if ($request->wantsJson()) {
                return response()->json(['message' => 'Error creating group', 'error' => $e->getMessage()], 500);
            }

            return redirect()->back()->withErrors(['error' => 'Error creating group: ' . $e->getMessage()]);
        }
    }

    private function generateNextCode()
    {
        $prefix = 'GRC-';
        $startNumber = 10001;

        $lastRecord = CustomerGroup::where('code', 'like', "{$prefix}%")
            ->orderByRaw('LENGTH(code) DESC')
            ->orderBy('code', 'desc')
            ->first();

        if (!$lastRecord) {
            return $prefix . $startNumber;
        }

        $lastCode = $lastRecord->code;
        // Remove prefix to get the number part
        $lastNumber = (int) str_replace($prefix, '', $lastCode);
        
        return $prefix . ($lastNumber + 1);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $group = CustomerGroup::findOrFail($id);

        if ($request->parent_id == $id) {
            return back()->withErrors(['parent_id' => 'Group cannot be its own parent.']);
        }

        $request->validate([
            'name_ar' => 'required|string|max:100',
            'name_en' => 'nullable|string|max:100',
            'code' => 'required|string|max:20|unique:customer_groups,code,' . $id,
            'parent_id' => 'nullable|exists:customer_groups,id',
            'account_id' => 'nullable|exists:accounts,AccID',
            'price_list_id' => 'nullable|integer',
            'payment_terms' => 'nullable|integer|min:0',
            'credit_limit' => 'nullable|numeric|min:0',
            'discount_percentage' => 'nullable|numeric|min:0|max:100',
            'notes' => 'nullable|string',
        ]);

        try {
            DB::beginTransaction();

            $group->update([
                'code' => $request->code,
                'name_ar' => $request->name_ar,
                'name_en' => $request->name_en,
                'parent_id' => $request->parent_id,
                'account_id' => $request->account_id,
                'price_list_id' => $request->price_list_id,
                'payment_terms' => $request->payment_terms ?? 30,
                'credit_limit' => $request->credit_limit ?? 0,
                'discount_percentage' => $request->discount_percentage ?? 0,
                'notes' => $request->notes,
                'is_active' => $request->has('is_active') ? $request->is_active : $group->is_active,
            ]);

            DB::commit();

            if ($request->wantsJson()) {
                return response()->json(['message' => 'Customer Group updated successfully', 'data' => $group]);
            }

            return redirect()->route('admin.client-sales.customer-groups.index')->with('success', 'Customer Group updated successfully');

        } catch (\Exception $e) {
            DB::rollBack();

            if ($request->wantsJson()) {
                return response()->json(['message' => 'Error updating group', 'error' => $e->getMessage()], 500);
            }

            return redirect()->back()->withErrors(['error' => 'Error updating group: ' . $e->getMessage()]);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, $id)
    {
        $group = CustomerGroup::findOrFail($id);

        try {
            // Check for dependencies (e.g. children, customers)
            if ($group->children()->exists()) {
                throw new \Exception('Cannot delete group with subgroups.');
            }
            
            // Check if used by customers (if relation exists)
            // if ($group->customers()->exists()) { ... }

            $group->delete();

            if ($request->wantsJson()) {
                return response()->json(['message' => 'Customer Group deleted successfully']);
            }

            return redirect()->route('admin.client-sales.customer-groups.index')->with('success', 'Customer Group deleted successfully');

        } catch (\Exception $e) {
            if ($request->wantsJson()) {
                return response()->json(['message' => 'Error deleting group', 'error' => $e->getMessage()], 500);
            }

            return redirect()->back()->withErrors(['error' => 'Error deleting group: ' . $e->getMessage()]);
        }
    }
}
