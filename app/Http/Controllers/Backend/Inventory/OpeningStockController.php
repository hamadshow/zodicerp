<?php

namespace App\Http\Controllers\Backend\Inventory;

use App\Http\Controllers\Controller;
use App\Models\ItemUnit;
use App\Models\Products;
use App\Models\Warehouses;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class OpeningStockController extends Controller
{
    private function getStockMovementCompanyReference(): ?object
    {
        if (! Schema::hasTable('stock_movements') || ! Schema::hasColumn('stock_movements', 'company_id')) {
            return null;
        }

        $dbName = DB::getDatabaseName();

        return DB::table('information_schema.KEY_COLUMN_USAGE')
            ->select(['CONSTRAINT_NAME', 'REFERENCED_TABLE_NAME'])
            ->where('TABLE_SCHEMA', $dbName)
            ->where('TABLE_NAME', 'stock_movements')
            ->where('COLUMN_NAME', 'company_id')
            ->whereNotNull('REFERENCED_TABLE_NAME')
            ->first();
    }

    private function ensureStockMovementCompanyFkAligned(): ?string
    {
        $fk = $this->getStockMovementCompanyReference();
        $referenced = (string) ($fk->REFERENCED_TABLE_NAME ?? '');
        if ($referenced === 'company') {
            return 'company';
        }

        if (! Schema::hasTable('company')) {
            return $referenced !== '' ? $referenced : null;
        }

        if ($referenced !== '' && $fk && ($fk->CONSTRAINT_NAME ?? null)) {
            try {
                Schema::table('stock_movements', function (\Illuminate\Database\Schema\Blueprint $table) use ($fk) {
                    $table->dropForeign((string) $fk->CONSTRAINT_NAME);
                });
            } catch (\Throwable $e) {
            }
        }

        $fresh = $this->getStockMovementCompanyReference();
        $freshReferenced = (string) ($fresh->REFERENCED_TABLE_NAME ?? '');
        if ($freshReferenced === 'company') {
            return 'company';
        }

        try {
            Schema::table('stock_movements', function (\Illuminate\Database\Schema\Blueprint $table) {
                $table
                    ->foreign('company_id', 'stock_movements_company_id_fk')
                    ->references('id')
                    ->on('company')
                    ->cascadeOnDelete();
            });
        } catch (\Throwable $e) {
        }

        $latest = $this->getStockMovementCompanyReference();

        return (string) ($latest->REFERENCED_TABLE_NAME ?? '');
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $companyId = $user?->company_id;

        $products = Products::query()
            ->select(['id', 'name', 'product_code', 'barcode', 'sku', 'cost_per_item'])
            ->when($companyId, function ($query) use ($companyId) {
                $query->where(function ($q) use ($companyId) {
                    $q->whereNull('company_id')->orWhere('company_id', $companyId);
                });
            })
            ->where('status', 'active')
            ->orderBy('name')
            ->limit(500)
            ->get();

        $units = ItemUnit::query()
            ->select(['id', 'name', 'company_id', 'conversion_factor', 'unit_type', 'base_unit'])
            ->active()
            ->when($companyId, function ($query) use ($companyId) {
                $query->where(function ($q) use ($companyId) {
                    $q->whereNull('company_id')->orWhere('company_id', $companyId);
                });
            })
            ->orderBy('name')
            ->get();

        $warehouses = Warehouses::query()
            ->select(['id', 'name', 'warehouse_code', 'company_id', 'status'])
            ->where('status', 'active')
            ->when($companyId, function ($query) use ($companyId) {
                $query->where(function ($q) use ($companyId) {
                    $q->whereNull('company_id')->orWhere('company_id', $companyId);
                });
            })
            ->orderBy('name')
            ->get();

        $nextReferenceId = (int) (DB::table('stock_movements')
            ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
            ->where('reference_type', 'opening_stock')
            ->max('reference_id') ?? 0) + 1;

        $referenceNo = 'OP-'.str_pad((string) $nextReferenceId, 4, '0', STR_PAD_LEFT);

        $openingStockLines = DB::table('stock_movements as m')
            ->leftJoin('stock_movements_details as d', 'm.id', '=', 'd.stock_movement_id')
            ->leftJoin('warehouses as w', 'w.id', '=', 'm.warehouse_id')
            ->when($companyId, fn ($q) => $q->where('m.company_id', $companyId))
            ->where('m.reference_type', 'opening_stock')
            ->groupBy(
                'm.id',
                'm.voucher_num',
                'm.movement_date',
                'm.warehouse_id',
                'm.notes',
                'm.company_id',
                'w.name',
                'w.warehouse_code'
            )
            ->orderByDesc('m.id')
            ->limit(500)
            ->get([
                'm.id',
                'm.voucher_num',
                'm.movement_date',
                'm.warehouse_id',
                'm.notes',
                'm.company_id',
                'w.name as warehouse_name',
                'w.warehouse_code as warehouse_code',
                DB::raw('COALESCE(SUM(d.quantity), 0) as total_quantity'),
                DB::raw('COALESCE(SUM(d.quantity * d.cost_price), 0) as total_cost'),
            ]);

        $editId = $request->query('edit');
        $editingMovement = null;
        if ($editId) {
            $header = DB::table('stock_movements')
                ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
                ->where('reference_type', 'opening_stock')
                ->where('id', (int) $editId)
                ->first();

            if ($header) {
                $details = DB::table('stock_movements_details as d')
                    ->leftJoin('products as p', 'p.id', '=', 'd.product_id')
                    ->leftJoin('item_units as u', 'u.id', '=', 'd.unit_id')
                    ->where('d.stock_movement_id', (int) $header->id)
                    ->orderBy('d.id')
                    ->get([
                        'd.id as detail_id',
                        'd.product_id',
                        'd.unit_id',
                        'd.quantity',
                        'd.cost_price',
                        'p.name as product_name',
                        'p.product_code as product_code',
                        'u.name as unit_name',
                    ]);

                $editingMovement = [
                    'id' => (int) $header->id,
                    'movement_date' => $header->movement_date,
                    'warehouse_id' => $header->warehouse_id,
                    'notes' => $header->notes,
                    'voucher_num' => $header->voucher_num,
                    'reference_id' => $header->reference_id,
                    'reference_type' => $header->reference_type,
                    'details' => $details,
                ];
            }
        }

        return Inertia::render('Backend/03-Inventory/OpeningStock', [
            'products' => $products,
            'units' => $units,
            'warehouses' => $warehouses,
            'defaultDate' => now()->toDateString(),
            'referenceId' => $nextReferenceId,
            'referenceNo' => $referenceNo,
            'openingStockLines' => $openingStockLines,
            'editingMovement' => $editingMovement,
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $companyId = $user?->company_id;
        if (! $companyId) {
            return redirect()->back()->with('error', 'Company is not set for this user.');
        }
        $companyId = (int) $companyId;
        $companyTable = Schema::hasTable('company')
            ? 'company'
            : (Schema::hasTable('companies') ? 'companies' : (Schema::hasTable('companies_shares') ? 'companies_shares' : null));

        if ($companyTable) {
            $companyExists = DB::table($companyTable)->where('id', $companyId)->exists();
            if (! $companyExists) {
                return redirect()->back()->with('error', 'Company is invalid for this user.');
            }
        }

        $stockCompanyRefTable = $this->ensureStockMovementCompanyFkAligned();
        if ($stockCompanyRefTable && $stockCompanyRefTable !== 'company' && Schema::hasTable($stockCompanyRefTable)) {
            $existsInRef = DB::table($stockCompanyRefTable)->where('id', $companyId)->exists();
            if (! $existsInRef) {
                return redirect()
                    ->route('admin.opening-stock.index', [
                        'country' => $request->route('country') ?? session('country_code', 'sa'),
                        'lang' => $request->route('lang') ?? session('locale', config('app.locale', 'ar')),
                    ])
                    ->with('error', 'تعذر الحفظ بسبب ربط company_id غير متوافق في stock_movements. تم اكتشاف مرجع: '.$stockCompanyRefTable);
            }
        }

        $validator = Validator::make($request->all(), [
            'date' => ['required', 'date'],
            'warehouse_id' => [
                'required',
                'integer',
                Rule::exists('warehouses', 'id')->where(function ($query) use ($companyId) {
                    $query
                        ->where('status', 'active')
                        ->where(function ($q) use ($companyId) {
                            $q->whereNull('company_id')->orWhere('company_id', $companyId);
                        });
                }),
            ],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => [
                'required',
                'integer',
                Rule::exists('products', 'id')->where(function ($query) use ($companyId) {
                    $query
                        ->where('status', 'active')
                        ->where(function ($q) use ($companyId) {
                            $q->whereNull('company_id')->orWhere('company_id', $companyId);
                        });
                }),
            ],
            'items.*.unit_id' => [
                'required',
                'integer',
                Rule::exists('item_units', 'id')->where(function ($query) use ($companyId) {
                    $query
                        ->where('active', 1)
                        ->where(function ($q) use ($companyId) {
                            $q->whereNull('company_id')->orWhere('company_id', $companyId);
                        });
                }),
            ],
            'items.*.quantity' => ['required', 'numeric', 'min:0.001'],
            'items.*.cost_price' => ['nullable', 'numeric', 'min:0'],
        ]);

        $validator->after(function ($v) use ($request) {
            $ids = collect($request->input('items', []))
                ->pluck('product_id')
                ->filter()
                ->map(fn ($id) => (string) $id)
                ->all();
            if (count($ids) !== count(array_unique($ids))) {
                $v->errors()->add('items', 'Duplicate products are not allowed.');
            }
        });

        $validated = $validator->validate();

        try {
            DB::transaction(function () use ($validated, $companyId) {
                $warehouse = Warehouses::query()
                    ->whereKey($validated['warehouse_id'])
                    ->where('status', 'active')
                    ->where(function ($q) use ($companyId) {
                        $q->whereNull('company_id')->orWhere('company_id', $companyId);
                    })
                    ->first();

                if (! $warehouse) {
                    throw ValidationException::withMessages([
                        'warehouse_id' => 'Warehouse is invalid for this company.',
                    ]);
                }

                $nextReferenceId = (int) (DB::table('stock_movements')
                    ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
                    ->where('reference_type', 'opening_stock')
                    ->lockForUpdate()
                    ->max('reference_id') ?? 0) + 1;

                $movementAt = Carbon::parse($validated['date'])->setTimeFromTimeString(now()->format('H:i:s'));
                $voucherNum = 'OP-'.str_pad((string) $nextReferenceId, 4, '0', STR_PAD_LEFT);

                $stockMovementId = DB::table('stock_movements')->insertGetId([
                    'movement_date' => Carbon::parse($validated['date'])->toDateString(),
                    'type' => 'opening',
                    'direction' => 'in',
                    'reference_id' => $nextReferenceId,
                    'reference_type' => 'opening_stock',
                    'voucher_num' => $voucherNum,
                    'warehouse_id' => (int) $validated['warehouse_id'],
                    'to_warehouse_id' => null,
                    'company_id' => (int) $companyId,
                    'notes' => $validated['notes'] ?? null,
                    'created_at' => $movementAt,
                    'updated_at' => $movementAt,
                ]);

                $rows = [];
                foreach ($validated['items'] as $item) {
                    $rows[] = [
                        'stock_movement_id' => (int) $stockMovementId,
                        'product_id' => (int) $item['product_id'],
                        'unit_id' => (int) $item['unit_id'],
                        'quantity' => (float) $item['quantity'],
                        'cost_price' => (float) ($item['cost_price'] ?? 0),
                        'batch_no' => null,
                        'expiry_date' => null,
                        'created_at' => $movementAt,
                        'updated_at' => $movementAt,
                    ];
                }

                DB::table('stock_movements_details')->insert($rows);
            });
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            report($e);

            $params = [
                'country' => $request->route('country') ?? session('country_code', 'sa'),
                'lang' => $request->route('lang') ?? session('locale', config('app.locale', 'ar')),
            ];

            return redirect()
                ->route('admin.opening-stock.index', $params)
                ->with('error', 'تعذر حفظ رصيد الافتتاح. تحقق من البيانات وحاول مرة أخرى.');
        }

        $params = [
            'country' => $request->route('country') ?? session('country_code', 'sa'),
            'lang' => $request->route('lang') ?? session('locale', config('app.locale', 'ar')),
        ];

        return redirect()
            ->route('admin.opening-stock.index', $params)
            ->with('success', 'Opening stock saved successfully.');
    }

    public function update(Request $request, $id)
    {
        $user = $request->user();
        $companyId = $user?->company_id;
        if (! $companyId) {
            return redirect()->back()->with('error', 'Company is not set for this user.');
        }
        $companyId = (int) $companyId;

        $movement = DB::table('stock_movements')
            ->where('id', (int) $id)
            ->where('reference_type', 'opening_stock')
            ->when($companyId, fn ($q) => $q->where('company_id', $companyId))
            ->first();

        if (! $movement) {
            return redirect()->back()->with('error', 'Opening stock voucher not found.');
        }

        $validator = Validator::make($request->all(), [
            'date' => ['required', 'date'],
            'warehouse_id' => [
                'required',
                'integer',
                Rule::exists('warehouses', 'id')->where(function ($query) use ($companyId) {
                    $query
                        ->where('status', 'active')
                        ->where(function ($q) use ($companyId) {
                            $q->whereNull('company_id')->orWhere('company_id', $companyId);
                        });
                }),
            ],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => [
                'required',
                'integer',
                Rule::exists('products', 'id')->where(function ($query) use ($companyId) {
                    $query
                        ->where('status', 'active')
                        ->where(function ($q) use ($companyId) {
                            $q->whereNull('company_id')->orWhere('company_id', $companyId);
                        });
                }),
            ],
            'items.*.unit_id' => [
                'required',
                'integer',
                Rule::exists('item_units', 'id')->where(function ($query) use ($companyId) {
                    $query
                        ->where('active', 1)
                        ->where(function ($q) use ($companyId) {
                            $q->whereNull('company_id')->orWhere('company_id', $companyId);
                        });
                }),
            ],
            'items.*.quantity' => ['required', 'numeric', 'min:0.001'],
            'items.*.cost_price' => ['nullable', 'numeric', 'min:0'],
        ]);

        $validator->after(function ($v) use ($request) {
            $ids = collect($request->input('items', []))
                ->pluck('product_id')
                ->filter()
                ->map(fn ($id) => (string) $id)
                ->all();
            if (count($ids) !== count(array_unique($ids))) {
                $v->errors()->add('items', 'Duplicate products are not allowed.');
            }
        });

        $validated = $validator->validate();

        try {
            DB::transaction(function () use ($validated, $companyId, $movement) {
                $movementAt = Carbon::parse($validated['date'])->setTimeFromTimeString(now()->format('H:i:s'));
                $voucherNum = $movement->voucher_num ?: ('OP-'.str_pad((string) ($movement->reference_id ?? 0), 4, '0', STR_PAD_LEFT));

                DB::table('stock_movements')
                    ->where('id', (int) $movement->id)
                    ->update([
                        'movement_date' => Carbon::parse($validated['date'])->toDateString(),
                        'warehouse_id' => (int) $validated['warehouse_id'],
                        'notes' => $validated['notes'] ?? null,
                        'voucher_num' => $voucherNum,
                        'updated_at' => $movementAt,
                    ]);

                DB::table('stock_movements_details')
                    ->where('stock_movement_id', (int) $movement->id)
                    ->delete();

                $rows = [];
                foreach ($validated['items'] as $item) {
                    $rows[] = [
                        'stock_movement_id' => (int) $movement->id,
                        'product_id' => (int) $item['product_id'],
                        'unit_id' => (int) $item['unit_id'],
                        'quantity' => (float) $item['quantity'],
                        'cost_price' => (float) ($item['cost_price'] ?? 0),
                        'batch_no' => null,
                        'expiry_date' => null,
                        'created_at' => $movementAt,
                        'updated_at' => $movementAt,
                    ];
                }

                DB::table('stock_movements_details')->insert($rows);
            });
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            report($e);

            $params = [
                'country' => $request->route('country') ?? session('country_code', 'sa'),
                'lang' => $request->route('lang') ?? session('locale', config('app.locale', 'ar')),
            ];

            return redirect()
                ->route('admin.opening-stock.index', $params)
                ->with('error', 'تعذر تعديل رصيد الافتتاح. تحقق من البيانات وحاول مرة أخرى.');
        }

        $params = [
            'country' => $request->route('country') ?? session('country_code', 'sa'),
            'lang' => $request->route('lang') ?? session('locale', config('app.locale', 'ar')),
        ];

        return redirect()
            ->route('admin.opening-stock.index', $params)
            ->with('success', 'Opening stock updated successfully.');
    }

    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        $companyId = (int) ($user?->company_id ?? 0);

        if (! $companyId) {
            return redirect()->back()->with('error', 'Company is not set for this user.');
        }

        $deleted = DB::table('stock_movements')
            ->where('id', (int) $id)
            ->where('reference_type', 'opening_stock')
            ->where('company_id', $companyId)
            ->delete();

        $params = [
            'country' => $request->route('country') ?? session('country_code', 'sa'),
            'lang' => $request->route('lang') ?? session('locale', config('app.locale', 'ar')),
        ];

        if (! $deleted) {
            return redirect()
                ->route('admin.opening-stock.index', $params)
                ->with('error', 'Opening stock voucher not found.');
        }

        return redirect()
            ->route('admin.opening-stock.index', $params)
            ->with('success', 'Opening stock deleted successfully.');
    }
}
