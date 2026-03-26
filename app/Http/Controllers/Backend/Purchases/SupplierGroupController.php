<?php

namespace App\Http\Controllers\Backend\Purchases;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Vendor_Purchases\SupplierGroup;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class SupplierGroupController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = SupplierGroup::with(['parent', 'account']);

        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name_ar', 'like', "%{$search}%")
                    ->orWhere('name_en', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            });
        }

        $groups = $query->latest()->get();
        $parentGroups = SupplierGroup::whereNull('parent_id')->get();
        $accounts = Account::where('AccStopped', false)->get();

        if ($request->wantsJson()) {
            return response()->json([
                'groups' => $groups,
                'parentGroups' => $parentGroups,
                'accounts' => $accounts,
            ]);
        }

        return Inertia::render('Backend/04-Purchases/Supplier_groups', [
            'groups' => $groups,
            'parentGroups' => $parentGroups,
            'accounts' => $accounts,
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
            'parent_id' => 'nullable|exists:supplier_groups,id',
            'account_id' => 'nullable|exists:accounts,AccID',
            'payment_terms' => 'nullable|integer|min:0',
            'default_credit_limit' => 'nullable|numeric|min:0',
            'default_tax_id' => 'nullable|integer',
            'notes' => 'nullable|string',
            'is_active' => 'nullable|in:0,1,true,false',
        ]);

        try {
            DB::beginTransaction();

            $code = $this->generateNextCode();

            $group = SupplierGroup::create([
                'code' => $code,
                'name_ar' => $request->name_ar,
                'name_en' => $request->name_en,
                'parent_id' => $request->parent_id,
                'account_id' => $request->account_id,
                'payment_terms' => $request->payment_terms ?? 30,
                'default_credit_limit' => $request->default_credit_limit ?? 0,
                'default_tax_id' => $request->default_tax_id,
                'notes' => $request->notes,
                'is_active' => $request->has('is_active') ? $request->is_active : true,
                'created_by' => Auth::id(),
            ]);

            DB::commit();

            if ($request->wantsJson()) {
                return response()->json(['message' => 'Supplier Group created successfully', 'data' => $group], 201);
            }

            return redirect()->route('admin.purchases.supplier-groups.index')->with('success', 'Supplier Group created successfully');

        } catch (\Exception $e) {
            DB::rollBack();

            if ($request->wantsJson()) {
                return response()->json(['message' => 'Error creating group', 'error' => $e->getMessage()], 500);
            }

            return redirect()->back()->withErrors(['error' => 'Error creating group: '.$e->getMessage()]);
        }
    }

    private function generateNextCode()
    {
        $prefix = 'GRS-';
        $startNumber = 10001;

        $lastRecord = SupplierGroup::where('code', 'like', "{$prefix}%")
            ->orderByRaw('LENGTH(code) DESC')
            ->orderBy('code', 'desc')
            ->first();

        if (! $lastRecord) {
            return $prefix.$startNumber;
        }

        $lastCode = $lastRecord->code;
        // Remove prefix to get the number part
        $lastNumber = (int) str_replace($prefix, '', $lastCode);

        return $prefix.($lastNumber + 1);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $group = SupplierGroup::findOrFail($id);

        if ($request->parent_id == $id) {
            return back()->withErrors(['parent_id' => 'المجموعة لا يمكن أن تكون أماً لنفسها.']);
        }

        // Prevent circular reference: Check if the selected parent is a child of the current group
        if ($request->parent_id) {
            $potentialParent = SupplierGroup::find($request->parent_id);
            if ($potentialParent && $this->isDescendantOf($potentialParent, $id)) {
                return back()->withErrors(['parent_id' => 'لا يمكن اختيار مجموعة تابعة لتكون مجموعة أم.']);
            }
        }

        $request->validate([
            'name_ar' => 'required|string|max:100',
            'name_en' => 'nullable|string|max:100',
            'code' => 'required|string|max:20|unique:supplier_groups,code,'.$id,
            'parent_id' => 'nullable|exists:supplier_groups,id',
            'account_id' => 'nullable|exists:accounts,AccID',
            'payment_terms' => 'nullable|integer|min:0',
            'default_credit_limit' => 'nullable|numeric|min:0',
            'default_tax_id' => 'nullable|integer',
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
                'payment_terms' => $request->payment_terms ?? 30,
                'default_credit_limit' => $request->default_credit_limit ?? 0,
                'default_tax_id' => $request->default_tax_id,
                'notes' => $request->notes,
                'is_active' => $request->has('is_active') ? $request->is_active : $group->is_active,
            ]);

            DB::commit();

            if ($request->wantsJson()) {
                return response()->json(['message' => 'Supplier Group updated successfully', 'data' => $group]);
            }

            return redirect()->route('admin.purchases.supplier-groups.index')->with('success', 'Supplier Group updated successfully');

        } catch (\Exception $e) {
            DB::rollBack();

            if ($request->wantsJson()) {
                return response()->json(['message' => 'Error updating group', 'error' => $e->getMessage()], 500);
            }

            return redirect()->back()->withErrors(['error' => 'Error updating group: '.$e->getMessage()]);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, $id)
    {
        $group = SupplierGroup::findOrFail($id);

        try {
            // Check for dependencies (e.g. children, suppliers)
            if ($group->children()->exists()) {
                throw new \Exception('لا يمكن حذف مجموعة تحتوي على مجموعات فرعية.');
            }

            if ($group->suppliers()->exists()) {
                throw new \Exception('لا يمكن حذف مجموعة مرتبطة بموردين.');
            }

            $group->delete();

            if ($request->wantsJson()) {
                return response()->json(['message' => 'تم حذف مجموعة الموردين بنجاح']);
            }

            return redirect()->route('admin.purchases.supplier-groups.index')->with('success', 'تم حذف مجموعة الموردين بنجاح');

        } catch (\Exception $e) {
            if ($request->wantsJson()) {
                return response()->json(['message' => 'خطأ أثناء حذف المجموعة', 'error' => $e->getMessage()], 500);
            }

            return redirect()->back()->withErrors(['error' => 'خطأ أثناء حذف المجموعة: '.$e->getMessage()]);
        }
    }

    private function isDescendantOf($group, $parentId)
    {
        $current = $group;
        while ($current->parent_id) {
            if ($current->parent_id == $parentId) {
                return true;
            }
            $current = SupplierGroup::find($current->parent_id);
            if (! $current) {
                break;
            }
        }

        return false;
    }
}
