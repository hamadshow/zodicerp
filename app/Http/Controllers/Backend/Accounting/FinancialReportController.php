<?php

namespace App\Http\Controllers\Backend\Accounting;

use App\Http\Controllers\Controller;
use App\Models\FinancialReport;
use App\Models\UserFavoriteReport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

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
                    $route = route($report->route_name);
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
                        $route = route($report->route_name);
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
}
