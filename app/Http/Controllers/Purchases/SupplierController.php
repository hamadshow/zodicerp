<?php

namespace App\Http\Controllers\Purchases;

use App\Http\Controllers\Controller;
use App\Models\Vendor_Purchases\Supplier;
use App\Models\Vendor_Purchases\SupplierAddress;
use App\Models\Vendor_Purchases\SupplierContact;
use App\Models\Vendor_Purchases\SupplierOpeningBalance;
use App\Models\Vendor_Purchases\SupplierGroup;
use App\Models\Country;
use App\Models\City;
use App\Models\Currency;
use App\Models\Warehouses;
use App\Models\Account;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Inertia\Inertia;
use App\Http\Requests\Purchases\StoreSupplierRequest;
use App\Http\Requests\Purchases\UpdateSupplierRequest;

class SupplierController extends Controller
{
    public function index()
    {
        $suppliers = Supplier::with(['group', 'currency', 'country', 'city', 'addresses', 'contacts', 'openingBalances'])
            ->orderBy('id', 'desc')
            ->paginate(10);

        return Inertia::render('Backend/04-Purchases/Suppliers', [
            'suppliers' => $suppliers,
            'filters' => request()->all(['search', 'group_id']),
            // Pass auxiliary data for the Create/Edit form modal/view
            'groups' => SupplierGroup::where('is_active', true)->get(),
            'countries' => Country::all(),
            'cities' => City::all(),
            'currencies' => Currency::all(),
            'warehouses' => Warehouses::all(), // Assuming model name is Warehouses
            'accounts' => Account::where('AccStopped', false)->get(),
        ]);
    }

    public function store(StoreSupplierRequest $request)
    {
        DB::beginTransaction();
        try {
            $data = $request->validated();
            
            // Auto-generate supplier code
            $latest = Supplier::latest('id')->first();
            if ($latest && preg_match('/^SUP-(\d+)$/', $latest->supplier_code, $matches)) {
                $nextId = intval($matches[1]) + 1;
            } else {
                $nextId = 10001;
            }
            $data['supplier_code'] = 'SUP-' . $nextId;

            $data['created_by'] = Auth::id();
            if (empty($data['password'])) {
                $data['password'] = Str::random(12);
            }

            // Create Supplier
            $supplier = Supplier::create($data);

            // Create Addresses
            if (!empty($data['addresses'])) {
                foreach ($data['addresses'] as $addressData) {
                    $supplier->addresses()->create($addressData);
                }
            }

            // Create Contacts
            if (!empty($data['contacts'])) {
                foreach ($data['contacts'] as $contactData) {
                    if (empty($contactData['name_ar'])) {
                        $contactData['name_ar'] = $contactData['name_en'] ?? 'Contact';
                    }
                    $supplier->contacts()->create($contactData);
                }
            }

            // Create Opening Balance
            if (!empty($data['opening_balance'])) {
                $obData = $data['opening_balance'];
                $obData['created_by'] = Auth::id();
                // Ensure required fields for OB are present or defaults set
                if (!empty($obData['debit_amount']) || !empty($obData['credit_amount'])) {
                    $supplier->openingBalances()->create($obData);
                }
            }

            DB::commit();
            return redirect()->route('admin.purchases.suppliers.index')->with('success', 'Supplier created successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->route('admin.purchases.suppliers.index')->with('error', 'Error creating supplier: ' . $e->getMessage());
        }
    }

    public function show($id)
    {
        $supplier = Supplier::with(['addresses', 'contacts', 'openingBalances'])->findOrFail($id);
        // We can return JSON for API or render a view. Since it's Inertia, likely we use index with selected supplier or a separate page.
        // The requirement says "Same form used for Create, Edit, View".
        // Usually index handles the list, and we might fetch details via API or pass them.
        // I'll return JSON if it's an API request, or render the page.
        if (request()->wantsJson()) {
            return response()->json($supplier);
        }
        return Inertia::render('Backend/04-Purchases/Suppliers', [
            'supplier' => $supplier
        ]);
    }

    public function update(UpdateSupplierRequest $request, $id)
    {
        DB::beginTransaction();
        try {
            $supplier = Supplier::findOrFail($id);
            $data = $request->validated();

            // Update Supplier
            $supplier->update($data);

            // Update Addresses
            // Strategy: Sync or Update/Create.
            // For simplicity in this form, we might delete missing and update/create existing if IDs are provided.
            // But 'sync' isn't standard for hasMany without custom logic.
            // I'll loop through provided addresses.
            
            // 1. Get current address IDs
            $currentAddressIds = $supplier->addresses()->pluck('id')->toArray();
            $incomingAddressIds = [];

            if (!empty($data['addresses'])) {
                foreach ($data['addresses'] as $addressData) {
                    if (isset($addressData['id']) && in_array($addressData['id'], $currentAddressIds)) {
                        $incomingAddressIds[] = $addressData['id'];
                        $supplier->addresses()->where('id', $addressData['id'])->update($addressData);
                    } else {
                        $supplier->addresses()->create($addressData);
                    }
                }
            }
            // Delete removed addresses
            $addressesToDelete = array_diff($currentAddressIds, $incomingAddressIds);
            if (!empty($addressesToDelete)) {
                $supplier->addresses()->whereIn('id', $addressesToDelete)->delete();
            }

            // Update Contacts
            $currentContactIds = $supplier->contacts()->pluck('id')->toArray();
            $incomingContactIds = [];

            if (!empty($data['contacts'])) {
                foreach ($data['contacts'] as $contactData) {
                    if (isset($contactData['id']) && in_array($contactData['id'], $currentContactIds)) {
                        $incomingContactIds[] = $contactData['id'];
                        if (empty($contactData['name_ar'])) {
                            $contactData['name_ar'] = $contactData['name_en'] ?? 'Contact';
                        }
                        $supplier->contacts()->where('id', $contactData['id'])->update($contactData);
                    } else {
                        if (empty($contactData['name_ar'])) {
                            $contactData['name_ar'] = $contactData['name_en'] ?? 'Contact';
                        }
                        $supplier->contacts()->create($contactData);
                    }
                }
            }
            $contactsToDelete = array_diff($currentContactIds, $incomingContactIds);
            if (!empty($contactsToDelete)) {
                $supplier->contacts()->whereIn('id', $contactsToDelete)->delete();
            }

            // Update Opening Balance
            // Assuming we edit the passed one or create if not exists
            if (!empty($data['opening_balance'])) {
                $obData = $data['opening_balance'];
                if (isset($obData['id'])) {
                    $supplier->openingBalances()->where('id', $obData['id'])->update($obData);
                } else {
                    $obData['created_by'] = Auth::id();
                    if (!empty($obData['debit_amount']) || !empty($obData['credit_amount'])) {
                        $supplier->openingBalances()->create($obData);
                    }
                }
            }

            DB::commit();
            return redirect()->route('admin.purchases.suppliers.index')->with('success', 'Supplier updated successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->route('admin.purchases.suppliers.index')->with('error', 'Error updating supplier: ' . $e->getMessage());
        }
    }

    public function destroy($id)
    {
        try {
            $supplier = Supplier::findOrFail($id);
            $supplier->delete();
            return redirect()->route('admin.purchases.suppliers.index')->with('success', 'Supplier deleted successfully.');
        } catch (\Exception $e) {
            return redirect()->route('admin.purchases.suppliers.index')->with('error', 'Error deleting supplier: ' . $e->getMessage());
        }
    }
}
