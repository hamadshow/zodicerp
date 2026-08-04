<?php

namespace App\Http\Controllers\Backend\Client_Sales;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Client_Sales\Customer;
use App\Models\Client_Sales\CustomerGroup;
use App\Models\Location;
use App\Models\Currency;
use App\Models\Vendor_Purchases\PriceList;
use App\Models\Vendor_Purchases\SalesAgent;
use App\Models\Warehouses;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;

class CustomerController extends Controller
{
    public function index()
    {
        $perPage = request('per_page', 10);
        $customers = Customer::with(['group', 'currency', 'country', 'city', 'addresses', 'contacts', 'openingBalances'])
            ->orderBy('customer_code', 'asc')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('Backend/05-Client_Sales/Customers', [
            'customers' => $customers,
            'filters' => request()->all(['search', 'group_id']),
            'groups' => CustomerGroup::where('is_active', true)->get(),
            'countries' => Location::where('location_type', 'country')->get(),
            'cities' => Location::where('location_type', 'city')->get(),
            'currencies' => Currency::all(),
            'warehouses' => Warehouses::all(),
            'accounts' => Account::where('AccStopped', false)->get(),
            'priceLists' => PriceList::where('is_active', true)->get(),
            'salesAgents' => SalesAgent::where('is_active', true)->get(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'customer_code' => 'nullable|string|unique:customers,customer_code',
            'name_ar' => 'nullable|string|max:255',
            'name_en' => 'required|string|max:255',
            'customer_group_id' => 'nullable|exists:customer_groups,id',
            'account_id' => 'nullable|exists:accounts,AccID',
            'currency_id' => 'nullable|exists:currencies,id',
            'price_list_id' => 'nullable|exists:price_lists,id',
            'sales_agent_id' => 'nullable|exists:sales_agents,id',
            'default_warehouse_id' => 'nullable|exists:warehouses,id',
            'tax_number' => 'nullable|string|max:50',
            'commercial_register' => 'nullable|string|max:50',
            'credit_limit' => 'nullable|numeric|min:0',
            'payment_terms' => 'nullable|integer|min:0',
            'primary_phone' => 'nullable|string|max:20',
            'secondary_phone' => 'nullable|string|max:20',
            'mobile' => 'nullable|string|max:20',
            'fax' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'website' => 'nullable|url|max:255',
            'is_active' => 'boolean',
            'notes' => 'nullable|string',
            'country_id' => 'nullable|exists:locations,id',
            'city_id' => 'nullable|exists:locations,id',
            'addresses' => 'array',
            'contacts' => 'array',
            'opening_balance' => 'array',
        ]);

        DB::beginTransaction();
        try {
            // Auto-generate code if not provided
            if (empty($data['customer_code'])) {
                $latest = Customer::latest('id')->first();
                if ($latest && preg_match('/^CUS-(\d+)$/', $latest->customer_code, $matches)) {
                    $nextId = intval($matches[1]) + 1;
                } else {
                    $nextId = 10001;
                }
                $data['customer_code'] = 'CUS-'.$nextId;
            }

            $data['created_by'] = Auth::id();

            $customer = Customer::create($data);

            // Create Addresses
            if (! empty($request->addresses)) {
                foreach ($request->addresses as $addr) {
                    $customer->addresses()->create($addr);
                }
            }

            // Create Contacts
            if (! empty($request->contacts)) {
                foreach ($request->contacts as $contact) {
                    $customer->contacts()->create($contact);
                }
            }

            // Create Opening Balance
            if (! empty($request->opening_balance)) {
                $obData = $request->opening_balance;
                if (! empty($obData['debit_amount']) || ! empty($obData['credit_amount'])) {
                    $obData['created_by'] = Auth::id();
                    $customer->openingBalances()->create($obData);
                }
            }

            DB::commit();

            return redirect()->route('admin.client-sales.customers.index')->with('success', 'Customer created successfully.');

        } catch (\Exception $e) {
            DB::rollBack();

            return redirect()->back()->with('error', 'Error creating customer: '.$e->getMessage());
        }
    }

    public function update(Request $request, $id)
    {
        $customer = Customer::findOrFail($id);

        $data = $request->validate([
            'customer_code' => 'required|string|unique:customers,customer_code,'.$id,
            'name_ar' => 'nullable|string|max:255',
            'name_en' => 'required|string|max:255',
            'customer_group_id' => 'nullable|exists:customer_groups,id',
            'account_id' => 'nullable|exists:accounts,AccID',
            'currency_id' => 'nullable|exists:currencies,id',
            'price_list_id' => 'nullable|exists:price_lists,id',
            'sales_agent_id' => 'nullable|exists:sales_agents,id',
            'default_warehouse_id' => 'nullable|exists:warehouses,id',
            'tax_number' => 'nullable|string|max:50',
            'commercial_register' => 'nullable|string|max:50',
            'credit_limit' => 'nullable|numeric|min:0',
            'payment_terms' => 'nullable|integer|min:0',
            'primary_phone' => 'nullable|string|max:20',
            'secondary_phone' => 'nullable|string|max:20',
            'mobile' => 'nullable|string|max:20',
            'fax' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'website' => 'nullable|url|max:255',
            'is_active' => 'boolean',
            'notes' => 'nullable|string',
            'country_id' => 'nullable|exists:locations,id',
            'city_id' => 'nullable|exists:locations,id',
            'addresses' => 'array',
            'contacts' => 'array',
            'opening_balance' => 'array',
        ]);

        DB::beginTransaction();
        try {
            $customer->update($data);

            // Sync Addresses
            $currentAddrIds = [];
            if (! empty($request->addresses)) {
                foreach ($request->addresses as $addr) {
                    if (isset($addr['id'])) {
                        $customer->addresses()->where('id', $addr['id'])->update($addr);
                        $currentAddrIds[] = $addr['id'];
                    } else {
                        $newAddr = $customer->addresses()->create($addr);
                        $currentAddrIds[] = $newAddr->id;
                    }
                }
            }
            $customer->addresses()->whereNotIn('id', $currentAddrIds)->delete();

            // Sync Contacts
            $currentContactIds = [];
            if (! empty($request->contacts)) {
                foreach ($request->contacts as $contact) {
                    if (isset($contact['id'])) {
                        $customer->contacts()->where('id', $contact['id'])->update($contact);
                        $currentContactIds[] = $contact['id'];
                    } else {
                        $newContact = $customer->contacts()->create($contact);
                        $currentContactIds[] = $newContact->id;
                    }
                }
            }
            $customer->contacts()->whereNotIn('id', $currentContactIds)->delete();

            // Update Opening Balance
            if (! empty($request->opening_balance)) {
                $obData = $request->opening_balance;
                if (isset($obData['id'])) {
                    $customer->openingBalances()->where('id', $obData['id'])->update($obData);
                } else {
                    if (! empty($obData['debit_amount']) || ! empty($obData['credit_amount'])) {
                        $obData['created_by'] = Auth::id();
                        $customer->openingBalances()->create($obData);
                    }
                }
            }

            DB::commit();

            return redirect()->route('admin.client-sales.customers.index')->with('success', 'Customer updated successfully.');

        } catch (\Exception $e) {
            DB::rollBack();

            return redirect()->back()->with('error', 'Error updating customer: '.$e->getMessage());
        }
    }

    public function destroy($id)
    {
        $customer = Customer::findOrFail($id);
        $customer->delete();

        return redirect()->route('admin.client-sales.customers.index')->with('success', 'Customer deleted successfully.');
    }

    public function bulkDelete(Request $request)
    {
        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:customers,id',
        ]);

        Customer::whereIn('id', $request->ids)->delete();

        return redirect()->route('admin.client-sales.customers.index')->with('success', 'Customers deleted successfully.');
    }

    public function import(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv',
        ]);

        // Simple import logic - can be enhanced with Laravel Excel or similar
        // For now, we assume the frontend sends processed data or we process it here
        // If frontend sends raw file, we would need to parse it.
        // Assuming the frontend processes it and sends JSON in a real-world scenario or we use a library.
        // Since we don't have Laravel Excel installed/configured in context,
        // we'll assume this method is a placeholder or uses basic PHP logic if needed.

        // However, based on the frontend code, it seems we might be sending data via a different endpoint
        // OR the frontend handles the parsing and sends an array of customers.
        // Let's check the frontend again.
        // The frontend `processExcelData` just logs the data. It doesn't seem to have a bulk create endpoint call yet.
        // I will implement a bulk store method that accepts an array of customer data.

        return redirect()->back()->with('error', 'Import functionality pending server-side implementation.');
    }

    public function bulkStore(Request $request)
    {
        set_time_limit(300); // 5 minutes

        $rows = $request->input('customers');
        if (empty($rows)) {
            return redirect()->back()->with('error', 'No valid rows to import.');
        }

        $created = 0;
        $errors = [];

        // Get Default Customer Group (or create one if none exists)
        $defaultGroup = CustomerGroup::firstOrCreate(
            ['code' => 'GRP-001'],
            ['name_ar' => 'عام', 'name_en' => 'General', 'is_active' => true]
        );
        $defaultGroupId = $defaultGroup->id;

        // Get Default Currency ID
        $defaultCurrencyId = Currency::where('is_base', true)->value('id') 
                          ?? Currency::where('code', 'SAR')->value('id') 
                          ?? Currency::where('code', 'USD')->value('id') 
                          ?? Currency::first()?->id 
                          ?? 1;

        // Pre-fetch related data for faster lookups
        $currencies = Currency::pluck('id', 'code')->toArray();
        $groups = CustomerGroup::pluck('id', 'code')->toArray();
        $accounts = Account::pluck('AccID', 'AccCode')->toArray();

        // Bulk duplicate checks
        $customerCodes = collect($rows)->pluck('customer_code')->filter()->toArray();
        $emails = collect($rows)->pluck('email')->filter()->toArray();

        $existingCodes = [];
        if (! empty($customerCodes)) {
            $existingCodes = Customer::whereIn('customer_code', $customerCodes)
                ->pluck('id', 'customer_code')
                ->toArray();
        }

        $existingEmails = [];
        if (! empty($emails)) {
            $existingEmails = Customer::whereIn('email', $emails)
                ->pluck('id', 'email')
                ->toArray();
        }

        $insertData = [];
        $now = now();
        $user = Auth::user();
        $userId = $user->id;
        $companyId = $user->company_id ?? null;

        foreach ($rows as $index => $row) {
            $email = $row['email'] ?? null;
            $code = $row['customer_code'] ?? null;

            // Skip if code exists
            if ($code && isset($existingCodes[$code])) {
                $errors[] = 'Row '.($index + 1).": Customer Code '$code' already exists.";
                continue;
            }

            // Skip if email exists
            if ($email && isset($existingEmails[$email])) {
                $errors[] = 'Row '.($index + 1).": Email '$email' already exists.";
                continue;
            }

            if (empty($code)) {
                $code = 'CUS-'.(10000 + $index + 1);
            }

            if (empty($email)) {
                $email = 'customer'.($index + 1).'_@example.com';
            }

            // Prepare data
            $data = [
                'customer_code' => $code,
                'name_ar' => $row['name_ar'] ?? ($row['name_en'] ?? 'New Customer'),
                'name_en' => $row['name_en'] ?? null,
                'customer_group_id' => $defaultGroupId,
                'primary_phone' => $row['primary_phone'] ?? null,
                'email' => $email,
                'is_active' => isset($row['is_active']) ? (bool) $row['is_active'] : true,
                'created_by' => $userId,
                'company_id' => $companyId,
                'password' => \Illuminate\Support\Facades\Hash::make(Str::random(12)),
                'currency_id' => $defaultCurrencyId,
                'account_id' => null,
                'created_at' => $now,
                'updated_at' => $now,
                'credit_limit' => 0.00,
                'current_balance' => 0.00,
                'payment_terms' => 30,
                'credit_days' => 30,
                'customer_type' => 'individual',
                'customer_class' => 'C',
            ];

            // Foreign Key Lookups
            if (! empty($row['group_code']) && isset($groups[$row['group_code']])) {
                $data['customer_group_id'] = $groups[$row['group_code']];
            }

            if (! empty($row['currency_code']) && isset($currencies[$row['currency_code']])) {
                $data['currency_id'] = $currencies[$row['currency_code']];
            }

            if (! empty($row['account_code']) && isset($accounts[$row['account_code']])) {
                $data['account_id'] = $accounts[$row['account_code']];
            }

            // Basic Validation
            if (empty($data['name_ar'])) {
                $errors[] = 'Row '.($index + 1).': Name (AR) or Name (EN) is required.';
                continue;
            }

            $insertData[] = $data;
            $created++;
        }

        if (empty($insertData)) {
            return redirect()->back()->with('error', 'No customers imported. Errors: '.implode(' | ', array_slice($errors, 0, 10)).(count($errors) > 10 ? '...' : ''));
        }

        DB::beginTransaction();
        try {
            // Bulk Insert in Chunks
            foreach (array_chunk($insertData, 500) as $chunk) {
                Customer::insert($chunk);
            }

            DB::commit();

            $msg = "Successfully imported $created customers.";
            if (count($errors) > 0) {
                $msg .= ' Skipped '.count($errors).' rows due to errors.';
                return redirect()->back()->with('warning', $msg);
            }

            return redirect()->route('admin.client-sales.customers.index')->with('success', $msg);

        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Server Error during database operation: '.$e->getMessage());
        }
    }
}
