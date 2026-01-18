<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use App\Models\FinancialReport;
use App\Models\UserFavoriteReport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FinancialReportController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([], 401);
        }

        if (method_exists($user, 'hasRole') && !$user->hasRole('admin')) {
            return response()->json([]);
        }

        $reports = FinancialReport::query()
            ->where('is_active', true)
            ->orderBy('category')
            ->orderBy('sort_order')
            ->orderBy('report_name')
            ->get();

        $favoriteIds = UserFavoriteReport::query()
            ->where('user_id', $user->id)
            ->pluck('report_id')
            ->all();

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

        if (!$user) {
            return response()->json([], 401);
        }

        $favorites = UserFavoriteReport::query()
            ->where('user_id', $user->id)
            ->with('report')
            ->get()
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

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $validated = $request->validate([
            'report_id' => ['required', 'integer', 'exists:financial_reports,id'],
        ]);

        $reportId = (int) $validated['report_id'];

        $existing = UserFavoriteReport::query()
            ->where('user_id', $user->id)
            ->where('report_id', $reportId)
            ->first();

        if ($existing) {
            $existing->delete();
            $isFavorite = false;
        } else {
            UserFavoriteReport::create([
                'user_id' => $user->id,
                'report_id' => $reportId,
            ]);
            $isFavorite = true;
        }

        return response()->json([
            'success' => true,
            'report_id' => $reportId,
            'is_favorite' => $isFavorite,
        ]);
    }
}

