<?php

namespace App\Http\Controllers\Backend\Purchases;

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
use App\Models\Products;
use App\Models\Client_Sales\SalesOrder;
use App\Models\Client_Sales\SalesOrderDetail;

class SupplierController extends Controller
{
    public function dashboard()
    {
        $supplier = Auth::guard('supplier')->user();
        
        if (!$supplier) {
            // This should ideally be handled by middleware, but for safety:
             return redirect()->route('supplier.login');
        }

        // Stats
        $totalProducts = Products::where('supplier_code', $supplier->supplier_code)->count();

        // Get order details for this supplier's products
        $supplierOrderDetailsQuery = SalesOrderDetail::whereHas('product', function($q) use ($supplier) {
            $q->where('supplier_code', $supplier->supplier_code);
        });

        // Clone query for revenue calculation
        $totalRevenue = (clone $supplierOrderDetailsQuery)->sum('line_total');
        
        // Get unique order IDs
        $orderIds = (clone $supplierOrderDetailsQuery)->pluck('order_id')->unique();
        $totalOrders = $orderIds->count();

        // Pending and Completed Orders
        $pendingOrders = SalesOrder::whereIn('id', $orderIds)->where('status', 'pending')->count();
        $completedOrders = SalesOrder::whereIn('id', $orderIds)->where('status', 'completed')->count();

        // Recent Orders
        $recentOrders = SalesOrder::whereIn('id', $orderIds)
            ->with(['details' => function($q) use ($supplier) {
                $q->whereHas('product', function($sq) use ($supplier) {
                    $sq->where('supplier_code', $supplier->supplier_code);
                })->with('product');
            }])
            ->orderBy('created_at', 'desc')
            ->take(5)
            ->get()
            ->map(function($order) {
                $supplierDetails = $order->details;
                $supplierAmount = $supplierDetails->sum('line_total');
                // Access name via translation or direct property depending on model
                $firstProduct = $supplierDetails->first()?->product?->name ?? 'Product';
                $moreCount = $supplierDetails->count() - 1;
                $productName = $moreCount > 0 ? "$firstProduct + $moreCount more" : $firstProduct;

                return [
                    'id' => $order->id,
                    'order_number' => $order->order_number,
                    'date' => $order->created_at->format('Y-m-d'),
                    'status' => ucfirst($order->status),
                    'amount' => number_format($supplierAmount, 2),
                    'product_name' => $productName,
                ];
            });

        return Inertia::render('Suppliers/Backend/Dashboard', [
            'stats' => [
                'total_products' => $totalProducts,
                'total_orders' => $totalOrders,
                'pending_orders' => $pendingOrders,
                'completed_orders' => $completedOrders,
                'total_revenue' => number_format($totalRevenue, 2),
            ],
            'recentOrders' => $recentOrders,
        ]);
    }

    public function products()
    {
        return Inertia::render('Suppliers/Backend/Products');
    }

    public function orders()
    {
        return Inertia::render('Suppliers/Backend/Orders');
    }

    public function earnings()
    {
        return Inertia::render('Suppliers/Backend/Earnings');
    }

    public function reviews()
    {
        return Inertia::render('Suppliers/Backend/Reviews');
    }

    public function profile()
    {
        return Inertia::render('Suppliers/Backend/Profile');
    }

    public function index()
    {
        $perPage = request('per_page', 10);
        $suppliers = Supplier::with(['group', 'currency', 'country', 'city', 'addresses', 'contacts', 'openingBalances'])
            ->when(request('search'), function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('supplier_code', 'like', "%{$search}%")
                      ->orWhere('name_ar', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%")
                      ->orWhere('primary_phone', 'like', "%{$search}%")
                      ->orWhere('secondary_phone', 'like', "%{$search}%");
                });
            })
            ->orderBy('favorite', 'desc')
            ->orderBy('supplier_code', 'asc')
            ->paginate($perPage)
            ->withQueryString();

        $suppliers->setCollection(
            $suppliers->getCollection()->transform(function ($supplier) {
                return $supplier->makeHidden(['password', 'remember_token']);
            })
        );

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

    public function toggleFavorite($id)
    {
        $supplier = Supplier::findOrFail($id);
        $supplier->favorite = !$supplier->favorite;
        $supplier->save();

        return redirect()->back()->with('success', 'Supplier favorite status updated.');
    }

    public function bulkImport(Request $request)
    {
        set_time_limit(300); // Increase execution time to 5 minutes

        $rows = $request->input('rows');
        if (empty($rows)) {
             return redirect()->back()->with('error', 'No valid rows to import.');
        }

        $created = 0;
        $errors = [];

        // Get Default Supplier Group (or create one if none exists)
        $defaultGroup = SupplierGroup::firstOrCreate(
            ['code' => 'GRP-001'],
            ['name_ar' => 'عام', 'name_en' => 'General', 'is_active' => true]
        );
        $defaultGroupId = $defaultGroup->id;

        // Pre-fetch related data for faster lookups
        $currencies = Currency::pluck('id', 'code')->toArray();
        $accounts = Account::pluck('AccID', 'AccCode')->toArray();
        $groups = SupplierGroup::pluck('id', 'code')->toArray();

        // Bulk duplicate checks
        $supplierCodes = collect($rows)->pluck('supplier_code')->filter()->toArray();
        $emails = collect($rows)->pluck('email')->filter()->toArray();

        $existingCodes = [];
        if (!empty($supplierCodes)) {
            $existingCodes = Supplier::whereIn('supplier_code', $supplierCodes)
                ->pluck('supplier_code')
                ->flip()
                ->toArray();
        }

        $existingEmails = [];
        if (!empty($emails)) {
            $existingEmails = Supplier::whereIn('email', $emails)
                ->pluck('email')
                ->flip()
                ->toArray();
        }

        $insertData = [];
        $now = now();
        $userId = Auth::id();

        DB::beginTransaction();
        try {
            foreach ($rows as $index => $row) {
                // Skip if supplier_code already exists
                $code = $row['supplier_code'] ?? null;
                if ($code && isset($existingCodes[$code])) {
                    $errors[] = "Row " . ($index + 1) . ": Supplier Code '$code' already exists.";
                    continue;
                }

                // Handle Telegram Duplication (Set to null if exists)
                $telegram = !empty($row['telegram']) ? $row['telegram'] : null;
                if ($telegram && isset($existingTelegrams[$telegram])) {
                    $telegram = null; // Clear telegram to avoid unique constraint violation
                }

                // Prepare data
                $data = [
                    'supplier_code' => $code,
                    'name_ar' => $row['name_ar'] ?? null,
                    'supplier_group_id' => $defaultGroupId,
                    'primary_phone' => $row['primary_phone'] ?? null,
                    'telegram' => $telegram,
                    'is_active' => isset($row['is_active']) ? (bool)$row['is_active'] : true,
                    'created_by' => $userId,
                    'password' => \Illuminate\Support\Facades\Hash::make(Str::random(12)), // Manually hash for bulk insert
                    'currency_id' => null,
                    'account_id' => null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];

                // Foreign Key Lookups (Memory-based)
                if (!empty($row['group_code']) && isset($groups[$row['group_code']])) {
                    $data['supplier_group_id'] = $groups[$row['group_code']];
                }

                if (!empty($row['currency_code']) && isset($currencies[$row['currency_code']])) {
                    $data['currency_id'] = $currencies[$row['currency_code']];
                }
                
                if (!empty($row['account_code']) && isset($accounts[$row['account_code']])) {
                    $data['account_id'] = $accounts[$row['account_code']];
                }

                // Basic Validation (Manual check to avoid Validator overhead)
                if (empty($data['supplier_code'])) {
                    $errors[] = "Row " . ($index + 1) . ": Supplier Code is required.";
                    continue;
                }
                if (empty($data['name_ar'])) {
                    $errors[] = "Row " . ($index + 1) . ": Name (AR) is required.";
                    continue;
                }

                $insertData[] = $data;
                $created++;
            }

            // Bulk Insert in Chunks
            if (!empty($insertData)) {
                foreach (array_chunk($insertData, 500) as $chunk) {
                    Supplier::insert($chunk);
                }
            }

            if ($created > 0) {
                DB::commit();
                $msg = "Successfully imported $created suppliers.";
                if (count($errors) > 0) {
                    $msg .= " Skipped " . count($errors) . " rows due to errors.";
                    return redirect()->back()->with('warning', $msg);
                }
                return redirect()->back()->with('success', $msg);
            } else {
                DB::rollBack();
                return redirect()->back()->with('error', 'No suppliers imported. Errors: ' . implode(' | ', array_slice($errors, 0, 10)) . (count($errors) > 10 ? '...' : ''));
            }

        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Server Error: ' . $e->getMessage());
        }
    }

    public function store(StoreSupplierRequest $request)
    {
        DB::beginTransaction();
        try {
            $data = $request->validated();
            unset($data['password_confirmation']);
            
            // Auto-generate supplier code
            $latest = Supplier::latest('id')->first();
            if ($latest && preg_match('/^VEN-(\d+)$/', $latest->supplier_code, $matches)) {
                $nextId = intval($matches[1]) + 1;
            } else {
                $nextId = 10001;
            }
            $data['supplier_code'] = 'VEN-' . $nextId;

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
            unset($data['password_confirmation']);
            if (empty($data['password'] ?? null)) {
                unset($data['password']);
            }

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
