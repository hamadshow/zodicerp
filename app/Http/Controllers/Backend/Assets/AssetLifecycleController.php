<?php

namespace App\Http\Controllers\Backend\Assets;

use App\Http\Controllers\Controller;
use App\Models\Assets\AssetDisposal;
use App\Models\Assets\AssetRevaluation;
use App\Services\Assets\AssetLifecycleService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AssetLifecycleController extends Controller
{
    public function __construct(
        protected AssetLifecycleService $lifecycleService
    ) {}

    /**
     * Depreciation Schedule page.
     *
     * Company-scoped asset selection + unified-engine schedule (monthly
     * projection and yearly summary) for the selected asset as of a date.
     * The as_of_date parameter is honoured by the engine.
     */
    public function depreciationSchedule(Request $request): Response
    {
        $companyId = auth()->user()->company_id ?? 1;
        $validated = $request->validate([
            'asset_id' => 'nullable|integer|exists:assets,id',
            'as_of_date' => 'nullable|date',
        ]);

        $assets = DB::table('assets')
            ->where('company_id', $companyId)
            ->where('status', 'active')
            ->where('is_depreciable', true)
            ->select(
                'id',
                'asset_number',
                DB::raw('COALESCE(NULLIF(name_en, ""), name_ar) as name'),
                'total_cost',
                'unit_cost',
                'quantity',
                'salvage_value',
                'useful_life_years',
                'depreciation_start_date',
                'purchase_date',
                'depreciation_method'
            )
            ->orderBy('name_en')
            ->get();

        $schedule = null;
        $yearlySchedule = null;
        $view = 'monthly';
        $asOfDate = $validated['as_of_date'] ?? now()->toDateString();

        if (!empty($validated['asset_id'])) {
            $asset = DB::table('assets')
                ->where('id', (int) $validated['asset_id'])
                ->where('company_id', $companyId)
                ->first();

            if ($asset) {
                try {
                    $monthly = $this->lifecycleService->buildMonthlySchedule($asset, $asOfDate);
                    $yearly = $this->lifecycleService->buildYearlySchedule($asset, $asOfDate);

                    $view = $request->input('view') === 'yearly' ? 'yearly' : 'monthly';
                    $schedule = $view === 'yearly' ? $yearly : $monthly;
                    $yearlySchedule = $yearly;
                } catch (\Exception $e) {
                    // Show the configuration problem instead of a blank page.
                    $schedule = [
                        'asset' => [
                            'id' => $asset->id,
                            'asset_number' => $asset->asset_number,
                            'name' => $asset->name_en ?: $asset->name_ar,
                            'status' => $asset->status,
                        ],
                        'summary' => null,
                        'rows' => [],
                        'error' => $e->getMessage(),
                    ];
                    $yearlySchedule = null;
                }
            }
        }

        return Inertia::render('Backend/08-Assets/DepreciationSchedule', [
            'assets' => $assets,
            'schedule' => $schedule,
            'yearlySchedule' => $yearlySchedule,
            'view' => $view,
            'as_of_date' => $asOfDate,
            'filters' => $request->only(['asset_id', 'as_of_date', 'view']),
        ]);
    }

    /**
     * Post depreciation for ONE asset as of a date (exposed from the
     * schedule page). All business rules live in the service.
     */
    public function runDepreciation(Request $request)
    {
        $validated = $request->validate([
            'asset_id' => 'required|integer|exists:assets,id',
            'as_of_date' => 'required|date',
        ]);

        try {
            $result = $this->lifecycleService->postDepreciation($validated);

            $message = __('depreciation.posted_single', [
                'period' => sprintf('%02d/%d', $result['period_month'], $result['period_year']),
                'amount' => number_format($result['depreciation_amount'], 2),
            ]);

            return redirect()->back()->with('success', $message);
        } catch (\Exception $e) {
            report($e);
            return redirect()->back()
                ->with('error', $e->getMessage())
                ->withInput();
        }
    }

    /**
     * Bulk depreciation: delegate entirely to the service (single business
     * logic entry point, company-scoped, per-asset error reporting).
     */
    public function runBulkDepreciation(Request $request)
    {
        $validated = $request->validate([
            'as_of_date' => 'required|date',
        ]);

        try {
            $result = $this->lifecycleService->runBulkDepreciation($validated);

            $message = __('depreciation.bulk_summary', [
                'posted' => $result['posted_count'],
                'skipped' => $result['skipped_count'],
                'failed' => $result['failed_count'],
            ]);

            $payload = ['success' => $message];
            if ($result['failed_count'] > 0) {
                $details = collect($result['failed'])
                    ->map(fn ($f) => ($f['asset_name'] ?: ('#' . $f['asset_id'])) . ': ' . $f['reason'])
                    ->implode(' | ');
                $payload['error'] = $details;
            }

            return redirect()->back()->with($payload);
        } catch (\Exception $e) {
            report($e);
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    /**
     * Reverse one posted depreciation record through JournalReversalService.
     */
    public function reverseDepreciation(Request $request)
    {
        $validated = $request->validate([
            'depreciation_id' => 'required|integer|exists:asset_depreciation,id',
        ]);

        try {
            $result = $this->lifecycleService->reverseDepreciation($validated);

            return redirect()->back()->with('success', __('depreciation.reversed'));
        } catch (\Exception $e) {
            report($e);
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    /**
     * Depreciation Report — one source of truth: aggregates the posted
     * asset_depreciation rows (the same records the unified engine writes)
     * and derives book value from the engine's cost-basis convention.
     */
    public function depreciationReport(Request $request): Response
    {
        $companyId = auth()->user()->company_id ?? 1;

        $query = DB::table('assets as a')
            ->leftJoin('asset_depreciation as d', function ($join) {
                $join->on('d.asset_id', '=', 'a.id')->where('d.is_posted', true);
            })
            ->where('a.company_id', $companyId)
            ->groupBy('a.id', 'a.asset_number', 'a.name_en', 'a.name_ar', 'a.total_cost', 'a.unit_cost', 'a.quantity', 'a.status')
            ->select(
                'a.id',
                'a.asset_number',
                DB::raw('COALESCE(NULLIF(a.name_en, ""), a.name_ar) as asset_name'),
                'a.total_cost',
                'a.unit_cost',
                'a.quantity',
                'a.status',
                DB::raw('COALESCE(SUM(d.depreciation_amount), 0) as total_depreciation'),
                DB::raw('COUNT(d.id) as posted_months'),
                DB::raw('MAX(d.period_year) as last_period_year'),
                DB::raw('MAX(d.period_month) as last_period_month')
            );

        if ($request->filled('search')) {
            $search = trim((string) $request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('a.name_en', 'like', "%{$search}%")
                    ->orWhere('a.name_ar', 'like', "%{$search}%")
                    ->orWhere('a.asset_number', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('a.status', $request->input('status'));
        }

        $report = $query->orderBy('asset_name')->get();

        // Cost basis must follow the engine convention: total_cost,
        // else unit_cost × quantity (createRevaluationFromAsset rule).
        $report->transform(function ($row) {
            $cost = (!empty($row->total_cost) && (float) $row->total_cost > 0)
                ? (float) $row->total_cost
                : (float) $row->unit_cost * (float) $row->quantity;
            $row->cost = round($cost, 2);
            $row->total_depreciation = round((float) $row->total_depreciation, 2);
            $row->book_value = round($cost - (float) $row->total_depreciation, 2);
            return $row;
        });

        return Inertia::render('Backend/08-Assets/DepreciationReport', [
            'report' => $report,
            'filters' => $request->only(['search', 'status']),
        ]);
    }

    /**
     * Record a new asset disposal for the current company.
     *
     * The accounting snapshot (cost / accumulated depreciation / net book value)
     * and the resulting gain or loss are derived server-side from the asset and its
     * posted depreciation using the shared lifecycle rules. The record is created
     * unposted so it remains fully editable; posting to the general ledger stays the
     * responsibility of the asset lifecycle disposal service.
     */
    public function dispose(Request $request)
    {
        $validated = $this->validateDisposal($request);
        $companyId = auth()->user()->company_id ?? 1;

        try {
            DB::transaction(function () use ($validated, $companyId) {
                $asset = DB::table('assets')
                    ->where('id', $validated['asset_id'])
                    ->where('company_id', $companyId)
                    ->first();

                if (!$asset) {
                    throw ValidationException::withMessages([
                        'asset_id' => 'The selected asset does not belong to your company.',
                    ]);
                }

                $alreadyDisposed = DB::table('asset_disposals')
                    ->where('asset_id', $asset->id)
                    ->where('disposal_date', $validated['disposal_date'])
                    ->exists();

                if ($alreadyDisposed) {
                    throw ValidationException::withMessages([
                        'disposal_date' => 'This asset already has a disposal recorded on this date.',
                    ]);
                }

                $snapshot = $this->lifecycleService->calculateDisposalSnapshot($asset);
                $amount = $this->normalizeAmount($validated['disposal_amount'] ?? null);

                $disposal = new AssetDisposal();
                $disposal->asset_id = $asset->id;
                $disposal->company_id = $companyId;
                $disposal->created_by = auth()->id();
                $disposal->disposal_date = $validated['disposal_date'];
                $disposal->disposal_method = $validated['disposal_method'];
                $disposal->original_cost = $snapshot['original_cost'];
                $disposal->accumulated_depreciation = $snapshot['accumulated_depreciation'];
                $disposal->net_book_value = $snapshot['net_book_value'];
                $disposal->disposal_amount = $amount;
                $disposal->gain_loss_amount = $amount === null
                    ? null
                    : round($amount - $snapshot['net_book_value'], 4);

                $this->applyDisposalDetails($disposal, $validated);
                $disposal->save();
            });

            return redirect()->back()->with('success', 'Asset disposal recorded.');
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    /**
     * Update an editable disposal record. The asset and the accounting snapshot
     * are immutable; posted records cannot be edited.
     */
    public function updateDisposal(Request $request, $id)
    {
        $companyId = auth()->user()->company_id ?? 1;
        $disposal = $this->findScopedDisposal($id, $companyId);

        if (!$disposal) {
            return redirect()->back()->with('error', 'Disposal record not found.');
        }

        if ($disposal->is_posted) {
            return redirect()->back()->with('error', 'Posted disposals cannot be edited.');
        }

        $validated = $this->validateDisposal($request, withAsset: false);

        try {
            DB::transaction(function () use ($disposal, $validated) {
                $duplicate = DB::table('asset_disposals')
                    ->where('asset_id', $disposal->asset_id)
                    ->where('disposal_date', $validated['disposal_date'])
                    ->where('id', '!=', $disposal->id)
                    ->exists();

                if ($duplicate) {
                    throw ValidationException::withMessages([
                        'disposal_date' => 'This asset already has a disposal recorded on this date.',
                    ]);
                }

                $amount = $this->normalizeAmount($validated['disposal_amount'] ?? null);
                $disposal->disposal_date = $validated['disposal_date'];
                $disposal->disposal_method = $validated['disposal_method'];
                $disposal->disposal_amount = $amount;
                $disposal->gain_loss_amount = $amount === null
                    ? null
                    : round($amount - (float) $disposal->net_book_value, 4);

                $this->applyDisposalDetails($disposal, $validated);
                $disposal->save();
            });

            return redirect()->back()->with('success', 'Asset disposal updated.');
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    /**
     * Delete a disposal record. Posted records (linked to the ledger) are protected.
     */
    public function destroyDisposal(Request $request, $id)
    {
        $companyId = auth()->user()->company_id ?? 1;
        $disposal = $this->findScopedDisposal($id, $companyId);

        if (!$disposal) {
            return redirect()->back()->with('error', 'Disposal record not found.');
        }

        if ($disposal->is_posted) {
            return redirect()->back()->with('error', 'Posted disposals cannot be deleted.');
        }

        try {
            $disposal->delete();
            return redirect()->back()->with('success', 'Asset disposal deleted.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Cannot delete disposal: ' . $e->getMessage());
        }
    }

    /**
     * Fetch a disposal scoped to the current company (asset ownership + record tag).
     * Returns null when the record does not exist or belongs to another company,
     * so callers can fail gracefully instead of surfacing a 404 page.
     */
    private function findScopedDisposal($id, int $companyId): ?AssetDisposal
    {
        return AssetDisposal::query()
            ->where('id', $id)
            ->where(function ($q) use ($companyId) {
                $q->whereNull('company_id')->orWhere('company_id', $companyId);
            })
            ->whereHas('asset', fn ($q) => $q->where('company_id', $companyId))
            ->first();
    }

    /**
     * Shared validation rules for disposal create/update.
     */
    private function validateDisposal(Request $request, bool $withAsset = true): array
    {
        $rules = [
            'disposal_date' => 'required|date',
            'disposal_method' => 'required|in:sale,scrap,donation,loss,theft,exchange',
            'disposal_amount' => 'nullable|numeric|min:0',
            'disposal_currency_id' => 'nullable|integer|exists:currencies,id',
            'buyer_name' => 'nullable|string|max:200',
            'buyer_contact' => 'nullable|string|max:500',
            'invoice_number' => 'nullable|string|max:100',
            'notes' => 'nullable|string|max:5000',
        ];

        if ($withAsset) {
            $rules['asset_id'] = 'required|integer|exists:assets,id';
        }

        return $request->validate($rules);
    }

    /**
     * Apply the user-editable, non-accounting fields shared by create and update.
     */
    private function applyDisposalDetails(AssetDisposal $disposal, array $validated): void
    {
        $disposal->disposal_currency_id = $validated['disposal_currency_id'] ?? null;
        $disposal->buyer_name = $validated['buyer_name'] ?? null;
        $disposal->buyer_contact = $validated['buyer_contact'] ?? null;
        $disposal->invoice_number = $validated['invoice_number'] ?? null;
        $disposal->notes = $validated['notes'] ?? null;
    }

    /**
     * Normalise an optional monetary input: blank strings become null.
     */
    private function normalizeAmount($value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        return round((float) $value, 4);
    }

    public function move(Request $request)
    {
        $validated = $request->validate([
            'asset_id' => 'required|exists:assets,id',
            'movement_date' => 'required|date',
            'to_warehouse_id' => 'nullable|exists:warehouses,id',
            'to_department_id' => 'nullable|integer',
            'to_employee_id' => 'nullable|integer',
            'reason' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        try {
            $this->lifecycleService->moveAsset($validated);
            return redirect()->back()->with('success', 'Asset movement recorded.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    public function movements(Request $request): Response
    {
        $companyId = auth()->user()->company_id ?? 1;

        $movements = DB::table('asset_movements')
            ->join('assets', 'assets.id', '=', 'asset_movements.asset_id')
            ->join('users', 'users.id', '=', 'assets.created_by')
            ->leftJoin('warehouses as wh', 'wh.id', '=', 'asset_movements.to_warehouse_id')
            ->where('users.company_id', $companyId)
            ->select(
                'asset_movements.*',
                DB::raw('COALESCE(assets.name_en, assets.name_ar) as name'),
                'wh.name as to_warehouse_name'
            )
            ->orderByDesc('asset_movements.movement_date')
            ->paginate(20);

        $assets = DB::table('assets')
            ->join('users', 'users.id', '=', 'assets.created_by')
            ->where('users.company_id', $companyId)
            ->select('assets.*', DB::raw('COALESCE(assets.name_en, assets.name_ar) as name'))
            ->orderBy('name_ar')
            ->get();
        $warehouses = DB::table('warehouses')->orderBy('name')->get();

        return Inertia::render('Backend/08-Assets/AssetMovement', [
            'movements' => $movements,
            'assets' => $assets,
            'warehouses' => $warehouses,
        ]);
    }

    /**
     * List asset disposals for the current company, with server-side search,
     * asset/method filters, sorting and pagination.
     */
    public function disposals(Request $request): Response
    {
        $companyId = auth()->user()->company_id ?? 1;

        // Assets selectable for disposal (current company, still active).
        $assets = DB::table('assets')
            ->where('company_id', $companyId)
            ->where('status', 'active')
            ->select(
                'id',
                'asset_number',
                DB::raw('COALESCE(name_en, name_ar) as name'),
                'total_cost',
                'unit_cost',
                'quantity',
                'accumulated_depreciation',
                'net_book_value',
                'currency_id'
            )
            ->orderBy('id')
            ->get();

        $query = DB::table('asset_disposals')
            ->join('assets', 'assets.id', '=', 'asset_disposals.asset_id')
            ->leftJoin('users as creator', 'creator.id', '=', 'asset_disposals.created_by')
            ->leftJoin('currencies as cur', 'cur.id', '=', 'asset_disposals.disposal_currency_id')
            ->where('assets.company_id', $companyId)
            // Never expose a record explicitly tagged to another company.
            ->where(function ($q) use ($companyId) {
                $q->whereNull('asset_disposals.company_id')
                    ->orWhere('asset_disposals.company_id', $companyId);
            })
            ->select(
                'asset_disposals.*',
                DB::raw("COALESCE(NULLIF(assets.asset_number, ''), CONCAT('#', assets.id)) as asset_number"),
                DB::raw('COALESCE(assets.name_en, assets.name_ar) as asset_name'),
                DB::raw("COALESCE(NULLIF(creator.fullname, ''), creator.username, creator.email) as created_by_name"),
                'cur.code as currency_code'
            );

        if ($request->filled('asset_id')) {
            $query->where('asset_disposals.asset_id', (int) $request->input('asset_id'));
        }

        if ($request->filled('disposal_method')) {
            $query->where('asset_disposals.disposal_method', $request->input('disposal_method'));
        }

        if ($search = trim((string) $request->input('search'))) {
            $query->where(function ($q) use ($search) {
                $q->where('assets.name_en', 'like', "%{$search}%")
                    ->orWhere('assets.name_ar', 'like', "%{$search}%")
                    ->orWhere('assets.asset_number', 'like', "%{$search}%")
                    ->orWhere('asset_disposals.buyer_name', 'like', "%{$search}%")
                    ->orWhere('asset_disposals.invoice_number', 'like', "%{$search}%")
                    ->orWhere('asset_disposals.notes', 'like', "%{$search}%");
            });
        }

        $sortMap = [
            'disposal_date' => 'asset_disposals.disposal_date',
            'asset_name' => 'asset_name',
            'net_book_value' => 'asset_disposals.net_book_value',
            'disposal_amount' => 'asset_disposals.disposal_amount',
            'gain_loss_amount' => 'asset_disposals.gain_loss_amount',
        ];
        $sortKey = $sortMap[$request->input('sort_key')] ?? 'asset_disposals.disposal_date';
        $sortDir = strtolower((string) $request->input('sort_dir', 'desc')) === 'asc' ? 'asc' : 'desc';

        $disposals = $query
            ->orderBy($sortKey, $sortDir)
            ->orderByDesc('asset_disposals.id')
            ->paginate((int) $request->input('per_page', 10))
            ->withQueryString();

        $currencies = DB::table('currencies')
            ->where('status', 'active')
            ->whereNull('deleted_at')
            ->orderBy('code')
            ->get(['id', 'code', 'name']);

        return Inertia::render('Backend/08-Assets/AssetDisposal', [
            'disposals' => $disposals,
            'assets' => $assets,
            'currencies' => $currencies,
        ]);
    }

    public function revaluation(Request $request): Response
    {
        $companyId = auth()->user()->company_id ?? 1;

        $assets = DB::table('assets')
            ->where('company_id', $companyId)
            ->where('status', 'active')
            ->select(
                'id',
                'asset_number',
                DB::raw('COALESCE(name_en, name_ar) as name'),
                'total_cost',
                'unit_cost',
                'quantity',
                'accumulated_depreciation',
                'net_book_value'
            )
            ->orderBy('id')
            ->get();

        $query = DB::table('asset_revaluation')
            ->join('assets', 'assets.id', '=', 'asset_revaluation.asset_id')
            ->leftJoin('users as creator', 'creator.id', '=', 'asset_revaluation.created_by')
            ->where('assets.company_id', $companyId)
            ->select(
                'asset_revaluation.*',
                DB::raw("COALESCE(NULLIF(assets.asset_number, ''), CONCAT('#', assets.id)) as asset_number"),
                DB::raw('COALESCE(assets.name_en, assets.name_ar) as asset_name'),
                'creator.fullname as created_by_name'
            );

        if ($request->filled('asset_id')) {
            $query->where('asset_revaluation.asset_id', (int) $request->input('asset_id'));
        }

        if ($search = trim((string) $request->input('search'))) {
            $query->where(function ($q) use ($search) {
                $q->where('assets.name_en', 'like', "%{$search}%")
                    ->orWhere('assets.name_ar', 'like', "%{$search}%")
                    ->orWhere('assets.asset_number', 'like', "%{$search}%")
                    ->orWhere('asset_revaluation.reason', 'like', "%{$search}%");
            });
        }

        $sortMap = [
            'revaluation_date' => 'asset_revaluation.revaluation_date',
            'asset_name' => 'asset_name',
            'new_cost' => 'asset_revaluation.new_cost',
            'new_net_book_value' => 'asset_revaluation.new_net_book_value',
        ];
        $sortKey = $sortMap[$request->input('sort_key')] ?? 'asset_revaluation.revaluation_date';
        $sortDir = strtolower((string) $request->input('sort_dir', 'desc')) === 'asc' ? 'asc' : 'desc';

        $revaluations = $query
            ->orderBy($sortKey, $sortDir)
            ->paginate((int) $request->input('per_page', 10))
            ->withQueryString();

        return Inertia::render('Backend/08-Assets/AssetRevaluation', [
            'revaluations' => $revaluations,
            'assets' => $assets,
        ]);
    }

    /**
     * Store a newly created asset revaluation.
     * previous_* values are a system snapshot of the asset at revaluation time;
     * derived deltas are computed server-side. No GL posting (is_posted stays 0).
     */
    public function storeRevaluation(Request $request)
    {
        $validated = $this->validateRevaluation($request);
        $companyId = auth()->user()->company_id ?? 1;

        try {
            DB::transaction(function () use ($validated, $companyId) {
                $asset = DB::table('assets')
                    ->where('id', $validated['asset_id'])
                    ->where('company_id', $companyId)
                    ->first();

                if (!$asset) {
                    throw ValidationException::withMessages([
                        'asset_id' => 'The selected asset does not belong to your company.',
                    ]);
                }

                $this->createRevaluationFromAsset($asset, $validated, $companyId);
            });

            return redirect()->back()->with('success', 'Asset revaluation recorded.');
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    /**
     * Update an editable revaluation record. previous_* snapshot is immutable;
     * derived values are recomputed. Posted records cannot be edited.
     */
    public function updateRevaluation(Request $request, $id)
    {
        $companyId = auth()->user()->company_id ?? 1;

        $revaluation = AssetRevaluation::query()
            ->where('id', $id)
            ->whereHas('asset', fn ($q) => $q->where('company_id', $companyId))
            ->firstOrFail();

        if ($revaluation->is_posted) {
            return redirect()->back()->with('error', 'Posted revaluations cannot be edited.');
        }

        $validated = $this->validateRevaluation($request, withAsset: false);

        try {
            DB::transaction(function () use ($revaluation, $validated) {
                $this->applyRevaluationValues($revaluation, $validated);
                $revaluation->save();
            });

            return redirect()->back()->with('success', 'Asset revaluation updated.');
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    /**
     * Delete a revaluation record. Posted records (linked to the ledger) cannot be deleted.
     */
    public function destroyRevaluation(Request $request, $id)
    {
        $companyId = auth()->user()->company_id ?? 1;

        $revaluation = AssetRevaluation::query()
            ->where('id', $id)
            ->whereHas('asset', fn ($q) => $q->where('company_id', $companyId))
            ->firstOrFail();

        if ($revaluation->is_posted) {
            return redirect()->back()->with('error', 'Posted revaluations cannot be deleted.');
        }

        try {
            $revaluation->delete();
            return redirect()->back()->with('success', 'Asset revaluation deleted.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Cannot delete revaluation: ' . $e->getMessage());
        }
    }

    /**
     * Shared validation rules for revaluation create/update.
     */
    private function validateRevaluation(Request $request, bool $withAsset = true): array
    {
        $rules = [
            'revaluation_date' => 'required|date',
            'new_cost' => 'required|numeric|min:0',
            'new_accumulated_depreciation' => 'required|numeric|min:0|lte:new_cost',
            'reason' => 'nullable|string|max:1000',
            'notes' => 'nullable|string|max:1000',
        ];

        if ($withAsset) {
            $rules['asset_id'] = 'required|integer|exists:assets,id';
        }

        return $request->validate($rules);
    }

    /**
     * Build a revaluation record from the asset's current values.
     */
    private function createRevaluationFromAsset(object $asset, array $validated, int $companyId): void
    {
        $revaluation = new AssetRevaluation();
        $revaluation->asset_id = $asset->id;
        $revaluation->company_id = $companyId;
        $revaluation->created_by = auth()->id();

        $previousCost = (float) ($asset->total_cost ?? (($asset->unit_cost ?? 0) * ($asset->quantity ?? 1)));
        $previousAccumDep = (float) ($asset->accumulated_depreciation ?? 0);
        $previousNbv = (float) ($asset->net_book_value ?? ($previousCost - $previousAccumDep));

        $revaluation->previous_cost = round($previousCost, 4);
        $revaluation->previous_accumulated_depreciation = round($previousAccumDep, 4);
        $revaluation->previous_net_book_value = round($previousNbv, 4);

        $this->applyRevaluationValues($revaluation, $validated);
        $revaluation->save();
    }

    /**
     * Apply user-editable and derived values to a revaluation model.
     */
    private function applyRevaluationValues(AssetRevaluation $revaluation, array $validated): void
    {
        $revaluation->revaluation_date = $validated['revaluation_date'];

        $newCost = round((float) $validated['new_cost'], 4);
        $newAccumDep = round((float) $validated['new_accumulated_depreciation'], 4);
        $newNbv = round($newCost - $newAccumDep, 4);

        $revaluation->new_cost = $newCost;
        $revaluation->new_accumulated_depreciation = $newAccumDep;
        $revaluation->new_net_book_value = $newNbv;

        $costDelta = round($newCost - (float) $revaluation->previous_cost, 4);
        $revaluation->cost_increase = $costDelta > 0 ? $costDelta : null;
        $revaluation->cost_decrease = $costDelta < 0 ? abs($costDelta) : null;

        $nbvDelta = round($newNbv - (float) $revaluation->previous_net_book_value, 4);
        $revaluation->revaluation_surplus = $nbvDelta > 0 ? $nbvDelta : null;
        $revaluation->revaluation_deficit = $nbvDelta < 0 ? abs($nbvDelta) : null;

        $revaluation->reason = $validated['reason'] ?? null;
        $revaluation->notes = $validated['notes'] ?? null;
    }
}
