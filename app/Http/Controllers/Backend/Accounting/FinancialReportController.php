<?php

namespace App\Http\Controllers\Backend\Accounting;

use App\Exports\InventoryValuationExport;
use App\Http\Controllers\Controller;
use App\Models\FinancialReport;
use App\Models\UserFavoriteReport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class FinancialReportController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Backend/07-Accounting/FinancialReports');
    }

    public function getData(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([], 401);
        }

        $companyId = $user->company_id;
        $hasCompanyColumn = Schema::hasColumn('financial_reports', 'company_id');
        $hasFavoriteCompanyColumn = Schema::hasColumn('user_favorite_reports', 'company_id');

        $reportsQuery = FinancialReport::query()->where('is_active', true);

        if ($hasCompanyColumn && $companyId) {
            $reportsQuery->where(function ($q) use ($companyId) {
                $q->whereNull('company_id')->orWhere('company_id', $companyId);
            });
        }

        $reports = $reportsQuery
            ->orderBy('category')
            ->orderBy('sort_order')
            ->orderBy('report_name')
            ->get();

        $favoritesQuery = UserFavoriteReport::query()->where('user_id', $user->id);

        if ($hasFavoriteCompanyColumn && $companyId) {
            $favoritesQuery->where(function ($q) use ($companyId) {
                $q->whereNull('company_id')->orWhere('company_id', $companyId);
            });
        }

        $favoriteIds = $favoritesQuery->pluck('report_id')->all();

        $payload = $reports->map(function (FinancialReport $report) use ($favoriteIds) {
            $route = null;

            if ($report->route_name && $report->route_name !== '#') {
                try {
                    // Try to get parameters from request or session
                    $params = [
                        'country' => $request->route('country') ?? session('country_code', 'sa'),
                        'lang' => $request->route('lang') ?? session('locale', 'en'),
                    ];
                    $route = route($report->route_name, $params);
                } catch (\Throwable $e) {
                    $route = null;
                }
            }

            return [
                'id' => $report->id,
                'report_key' => $report->report_key,
                'report_name' => $report->report_name,
                'category' => $report->category,
                'route' => $route,
                'icon' => $report->icon,
                'sort_order' => $report->sort_order,
                'is_favorite' => in_array($report->id, $favoriteIds, true),
            ];
        })->values();

        return response()->json($payload);
    }

    public function favorites(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([], 401);
        }

        $companyId = $user->company_id;
        $hasCompanyColumn = Schema::hasColumn('financial_reports', 'company_id');
        $hasFavoriteCompanyColumn = Schema::hasColumn('user_favorite_reports', 'company_id');

        $favoritesQuery = UserFavoriteReport::query()
            ->where('user_id', $user->id)
            ->with('report');

        if ($hasFavoriteCompanyColumn && $companyId) {
            $favoritesQuery->where(function ($q) use ($companyId) {
                $q->whereNull('company_id')->orWhere('company_id', $companyId);
            });
        }

        if ($hasCompanyColumn && $companyId) {
            $favoritesQuery->whereHas('report', function ($q) use ($companyId) {
                $q->whereNull('company_id')->orWhere('company_id', $companyId);
            });
        }

        $favorites = $favoritesQuery->get()
            ->filter(fn (UserFavoriteReport $favorite) => $favorite->report !== null)
            ->map(function (UserFavoriteReport $favorite) {
                $report = $favorite->report;

                $route = null;

                if ($report->route_name && $report->route_name !== '#') {
                    try {
                        $params = [
                            'country' => $request->route('country') ?? session('country_code', 'sa'),
                            'lang' => $request->route('lang') ?? session('locale', 'en'),
                        ];
                        $route = route($report->route_name, $params);
                    } catch (\Throwable $e) {
                        $route = null;
                    }
                }

                return [
                    'id' => $report->id,
                    'report_key' => $report->report_key,
                    'report_name' => $report->report_name,
                    'category' => $report->category,
                    'route' => $route,
                    'icon' => $report->icon,
                ];
            })
            ->values();

        return response()->json($favorites);
    }

    public function toggleFavorite(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $validated = $request->validate([
            'report_id' => ['required', 'integer', 'exists:financial_reports,id'],
        ]);

        $reportId = (int) $validated['report_id'];
        $companyId = $user->company_id;
        $hasCompanyColumn = Schema::hasColumn('financial_reports', 'company_id');
        $hasFavoriteCompanyColumn = Schema::hasColumn('user_favorite_reports', 'company_id');

        $reportQuery = FinancialReport::query()->whereKey($reportId)->where('is_active', true);
        if ($hasCompanyColumn && $companyId) {
            $reportQuery->where(function ($q) use ($companyId) {
                $q->whereNull('company_id')->orWhere('company_id', $companyId);
            });
        }

        if (! $reportQuery->exists()) {
            return response()->json(['message' => 'Report not available.'], 404);
        }

        $existingQuery = UserFavoriteReport::query()
            ->where('user_id', $user->id)
            ->where('report_id', $reportId);

        if ($hasFavoriteCompanyColumn && $companyId) {
            $existingQuery->where(function ($q) use ($companyId) {
                $q->whereNull('company_id')->orWhere('company_id', $companyId);
            });
        }

        $existing = $existingQuery->exists();

        if ($existing) {
            $existingQuery->delete();
            $isFavorite = false;
        } else {
            $attributes = [
                'user_id' => $user->id,
                'report_id' => $reportId,
            ];

            if ($hasFavoriteCompanyColumn) {
                $attributes['company_id'] = $companyId;
            }

            UserFavoriteReport::create($attributes);
            $isFavorite = true;
        }

        return response()->json([
            'success' => true,
            'report_id' => $reportId,
            'is_favorite' => $isFavorite,
        ]);
    }

    public function coaReport(): Response
    {
        return Inertia::render('Backend/07-Accounting/FinancialReports/COAReport');
    }

    public function inventoryValuationSummary(Request $request): Response
    {
        $companyId = $request->user()?->company_id;
        if (! $companyId) {
            abort(403);
        }

        return Inertia::render('Backend/07-Accounting/FinancialReports/InventoryValuationSummary', [
            'companyId' => $companyId,
        ]);
    }

    public function getInventoryValuationSummaryData(Request $request): JsonResponse
    {
        $companyId = $request->user()?->company_id;
        if (! $companyId) {
            return response()->json([], 401);
        }

        $startDate = $request->input('start_date', now()->startOfMonth()->toDateString());
        $endDate = $request->input('end_date', now()->endOfMonth()->toDateString());

        $valuationData = $this->getInventoryValuationSummaryDataArray($companyId, $startDate, $endDate);

        return response()->json([
            'data' => $valuationData,
            'period' => [
                'start' => $startDate,
                'end' => $endDate,
            ]
        ]);
    }

    public function exportInventoryValuationSummary(Request $request)
    {
        $companyId = $request->user()?->company_id;
        if (! $companyId) {
            abort(403);
        }

        $startDate = $request->input('start_date', now()->startOfMonth()->toDateString());
        $endDate = $request->input('end_date', now()->endOfMonth()->toDateString());

        $valuationData = $this->getInventoryValuationSummaryDataArray($companyId, $startDate, $endDate);

        return Excel::download(
            new InventoryValuationExport($valuationData),
            "inventory_valuation_{$startDate}_to_{$endDate}.xlsx"
        );
    }

    private function getInventoryValuationSummaryDataArray($companyId, $startDate, $endDate)
    {
        // 1. Get all products
        $products = DB::table('products as p')
            ->where('p.company_id', $companyId)
            ->whereNull('p.deleted_at')
            ->select('p.id', 'p.name')
            ->get();

        $productIds = $products->pluck('id')->toArray();

        // 2. Get ALL movements for these products in one query to avoid N+1
        $allMovements = DB::table('stock_movements_items as i')
            ->join('stock_movements as h', 'h.id', '=', 'i.stock_movement_id')
            ->leftJoin('item_units as u', 'i.unit_id', '=', 'u.id')
            ->where('h.company_id', $companyId)
            ->whereIn('i.product_id', $productIds)
            ->select(
                'i.product_id',
                'h.movement_date',
                'h.from_warehouse_id',
                'h.to_warehouse_id',
                'h.warehouse_id',
                'h.notes',
                'i.quantity',
                'i.cost_price',
                'u.name as unit_name'
            )
            ->get()
            ->groupBy('product_id');

        return $products->map(function ($product) use ($allMovements, $startDate, $endDate) {
            $movements = $allMovements->get($product->id, collect());
            
            // Get the unit name from the first movement found, if any
            $unitName = $movements->whereNotNull('unit_name')->first()?->unit_name ?? '-';

            $openingQty = 0;
            $openingValue = 0;
            $inQty = 0;
            $inValue = 0;
            $outQty = 0;
            $outValue = 0;

            foreach ($movements as $m) {
                $qty = (float)$m->quantity;
                $val = $qty * (float)($m->cost_price ?? 0);
                
                // Determine movement type and direction for COMPANY-WIDE summary
                $isTransfer = ($m->from_warehouse_id && $m->to_warehouse_id);
                $isOpening = (strpos($m->notes ?? '', 'OpeningStock') !== false);
                
                $direction = 0; // 0 = no change to company total, 1 = in, -1 = out
                
                if ($isTransfer) {
                    $direction = 0; // Internal transfers don't change company total
                } elseif ($isOpening || ($m->warehouse_id && !$m->from_warehouse_id && !$m->to_warehouse_id)) {
                    $direction = 1;
                } elseif ($m->to_warehouse_id && !$m->from_warehouse_id) {
                    $direction = 1;
                } elseif ($m->from_warehouse_id && !$m->to_warehouse_id) {
                    $direction = -1;
                }

                // Handle null dates - treat as opening (before start date)
                $mDate = $m->movement_date ?? '0000-00-00';

                if ($mDate < $startDate) {
                    $openingQty += ($qty * $direction);
                    $openingValue += ($val * $direction);
                } elseif ($mDate <= $endDate) {
                    if ($direction === 1) {
                        $inQty += $qty;
                        $inValue += $val;
                    } elseif ($direction === -1) {
                        $outQty += $qty;
                        $outValue += $val;
                    }
                }
            }

            $closingQty = $openingQty + $inQty - $outQty;
            $closingValue = $openingValue + $inValue - $outValue;
            
            // Average cost should be based on positive closing inventory
            $avgCost = 0;
            if ($closingQty > 0) {
                $avgCost = $closingValue / $closingQty;
            } elseif ($inQty > 0) {
                // Fallback to average cost of IN movements if closing is 0 or negative
                $avgCost = $inValue / $inQty;
            }

            return [
                'product_name' => $product->name,
                'unit' => $unitName,
                'opening_qty' => $openingQty,
                'opening_value' => $openingValue,
                'in_qty' => $inQty,
                'in_value' => $inValue,
                'out_qty' => $outQty,
                'out_value' => $outValue,
                'closing_qty' => $closingQty,
                'avg_cost' => $avgCost,
                'closing_value' => $closingValue,
            ];
        });
    }
}
