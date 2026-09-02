<?php

namespace App\Http\Controllers\Backend\Assets;

use App\Http\Controllers\Controller;
use App\Services\Assets\AssetLifecycleService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class AssetLifecycleController extends Controller
{
    public function __construct(
        protected AssetLifecycleService $lifecycleService
    ) {}

    public function depreciationSchedule(Request $request): Response
    {
        $assets = DB::table('assets')
            ->where('status', 'active')
            ->orderBy('name')
            ->get();

        $schedule = null;
        if ($request->filled('asset_id')) {
            $schedule = $this->lifecycleService->getDepreciationSchedule([
                'asset_id' => $request->input('asset_id'),
            ]);
        }

        return Inertia::render('Backend/08-Assets/DepreciationSchedule', [
            'assets' => $assets,
            'schedule' => $schedule,
        ]);
    }

    public function runDepreciation(Request $request)
    {
        $validated = $request->validate([
            'asset_id' => 'required|exists:assets,id',
            'as_of_date' => 'required|date',
        ]);

        try {
            $result = $this->lifecycleService->postDepreciation($validated);
            return redirect()->back()->with('success', "Depreciation posted: {$result['amount_posted']}");
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    public function runBulkDepreciation(Request $request)
    {
        $validated = $request->validate([
            'as_of_date' => 'required|date',
        ]);

        $assets = DB::table('assets')->where('status', 'active')->get();
        $posted = 0;
        $skipped = 0;
        $errors = 0;

        foreach ($assets as $asset) {
            try {
                $result = $this->lifecycleService->postDepreciation([
                    'asset_id' => $asset->id,
                    'as_of_date' => $validated['as_of_date'],
                ]);
                if (($result['amount_posted'] ?? 0) > 0) {
                    $posted++;
                } else {
                    $skipped++;
                }
            } catch (\Exception $e) {
                $errors++;
            }
        }

        return redirect()->back()->with('success', "Depreciation complete. Posted: {$posted}, Skipped: {$skipped}, Errors: {$errors}");
    }

    public function depreciationReport(Request $request): Response
    {
        $companyId = auth()->user()->company_id ?? 1;

        $assets = DB::table('assets')
            ->where('company_id', $companyId)
            ->orderBy('name')
            ->get();

        $report = DB::table('asset_depreciation')
            ->join('assets', 'assets.id', '=', 'asset_depreciation.asset_id')
            ->where('assets.company_id', $companyId)
            ->where('asset_depreciation.is_posted', true)
            ->select(
                'assets.name as asset_name',
                'assets.purchase_price as cost',
                DB::raw('SUM(asset_depreciation.depreciation_amount) as total_depreciation')
            )
            ->groupBy('assets.id', 'assets.name', 'assets.purchase_price')
            ->get();

        return Inertia::render('Backend/08-Assets/DepreciationReport', [
            'assets' => $assets,
            'report' => $report,
        ]);
    }

    public function dispose(Request $request)
    {
        $validated = $request->validate([
            'asset_id' => 'required|exists:assets,id',
            'disposal_date' => 'required|date',
            'disposal_type' => 'nullable|in:sale,scrap,donation,loss,theft,exchange',
            'disposal_proceeds' => 'required|numeric|min:0',
            'reason' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        try {
            $result = $this->lifecycleService->disposeAsset($validated);
            $gainLossLabel = $result['gain_loss'] >= 0 ? 'Gain' : 'Loss';
            return redirect()->back()->with('success', "Asset disposed. {$gainLossLabel}: " . abs($result['gain_loss']));
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
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
            ->where('assets.company_id', $companyId)
            ->orderByDesc('asset_movements.movement_date')
            ->paginate(20);

        $assets = DB::table('assets')->where('company_id', $companyId)->orderBy('name')->get();
        $warehouses = DB::table('warehouses')->orderBy('name')->get();

        return Inertia::render('Backend/08-Assets/AssetMovement', [
            'movements' => $movements,
            'assets' => $assets,
            'warehouses' => $warehouses,
        ]);
    }

    public function disposals(Request $request): Response
    {
        $companyId = auth()->user()->company_id ?? 1;

        $disposals = DB::table('asset_disposals')
            ->join('assets', 'assets.id', '=', 'asset_disposals.asset_id')
            ->where('assets.company_id', $companyId)
            ->orderByDesc('asset_disposals.disposal_date')
            ->paginate(20);

        $assets = DB::table('assets')
            ->where('company_id', $companyId)
            ->where('status', 'active')
            ->orderBy('name')
            ->get();

        return Inertia::render('Backend/08-Assets/AssetDisposal', [
            'disposals' => $disposals,
            'assets' => $assets,
        ]);
    }

    public function revaluation(Request $request): Response
    {
        $companyId = auth()->user()->company_id ?? 1;

        $assets = DB::table('assets')
            ->where('company_id', $companyId)
            ->where('status', 'active')
            ->orderBy('name')
            ->get();

        $revaluations = DB::table('asset_revaluation')
            ->join('assets', 'assets.id', '=', 'asset_revaluation.asset_id')
            ->where('assets.company_id', $companyId)
            ->orderByDesc('asset_revaluation.created_at')
            ->get();

        return Inertia::render('Backend/08-Assets/AssetRevaluation', [
            'assets' => $assets,
            'revaluations' => $revaluations,
        ]);
    }
}
