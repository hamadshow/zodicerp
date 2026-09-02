<?php

namespace App\Services\Assets;

use Illuminate\Support\Facades\DB;

class AssetLifecycleService
{
    /**
     * Calculate and post depreciation for an asset up to a given date.
     */
    public function calculateDepreciation(array $data): array
    {
        $assetId = $data['asset_id'];
        $asOfDate = $data['as_of_date'] ?? now()->toDateString();

        $asset = DB::table('assets')->where('id', $assetId)->first();
        if (!$asset) {
            throw new \Exception('Asset not found.');
        }

        $depreciationMethod = $asset->depreciation_method ?? 'straight_line';
        $cost = (float) ($asset->purchase_price ?? $asset->cost ?? 0);
        $residualValue = (float) ($asset->residual_value ?? 0);
        $usefulLife = (int) ($asset->useful_life ?? 1);
        $startDate = $asset->depreciation_start_date ?? $asset->acquisition_date ?? $asset->purchase_date;

        if (!$startDate) {
            throw new \Exception('Asset has no depreciation start date.');
        }

        $depreciableAmount = $cost - $residualValue;
        $annualDepreciation = $depreciableAmount / max($usefulLife, 1);

        // Calculate months from start to asOfDate
        $start = new \DateTime($startDate);
        $end = new \DateTime($asOfDate);
        $interval = $start->diff($end);
        $monthsElapsed = ($interval->y * 12) + $interval->m;

        // Cap at useful life in months
        $totalMonths = $usefulLife * 12;
        $monthsToDepreciate = min($monthsElapsed, $totalMonths);

        $totalDepreciation = round(($annualDepreciation / 12) * $monthsToDepreciate, 2);
        $totalDepreciation = min($totalDepreciation, $depreciableAmount);

        $accumulatedDepreciation = (float) DB::table('asset_depreciations')
            ->where('asset_id', $assetId)
            ->where('status', 'posted')
            ->sum('amount');

        $remainingToDepreciate = $totalDepreciation - $accumulatedDepreciation;

        $bookValue = $cost - $accumulatedDepreciation - max(0, $remainingToDepreciate);

        return [
            'asset_id' => $assetId,
            'cost' => $cost,
            'residual_value' => $residualValue,
            'depreciable_amount' => $depreciableAmount,
            'depreciation_method' => $depreciationMethod,
            'useful_life_years' => $usefulLife,
            'months_elapsed' => $monthsElapsed,
            'total_depreciation_to_date' => $totalDepreciation,
            'accumulated_depreciation_posted' => $accumulatedDepreciation,
            'remaining_to_post' => max(0, $remainingToDepreciate),
            'book_value' => round($bookValue, 2),
        ];
    }

    /**
     * Post depreciation entries for an asset up to asOfDate.
     */
    public function postDepreciation(array $data): array
    {
        return DB::transaction(function () use ($data) {
            $calc = $this->calculateDepreciation($data);
            $assetId = $data['asset_id'];
            $remaining = $calc['remaining_to_post'];

            if ($remaining <= 0) {
                return ['message' => 'No depreciation to post.', 'calculation' => $calc];
            }

            // Create depreciation record
            $depreciationId = DB::table('asset_depreciations')->insertGetId([
                'asset_id' => $assetId,
                'period_start' => $data['as_of_date'] ?? now()->toDateString(),
                'period_end' => $data['as_of_date'] ?? now()->toDateString(),
                'depreciation_method' => $calc['depreciation_method'],
                'useful_life' => $calc['useful_life_years'],
                'cost' => $calc['cost'],
                'residual_value' => $calc['residual_value'],
                'depreciable_amount' => $calc['depreciable_amount'],
                'amount' => $remaining,
                'accumulated_depreciation' => $calc['accumulated_depreciation_posted'] + $remaining,
                'book_value' => $calc['book_value'],
                'status' => 'posted',
                'posted_by' => auth()->id(),
                'posted_at' => now(),
                'company_id' => auth()->user()->company_id ?? 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return [
                'depreciation_id' => $depreciationId,
                'amount_posted' => $remaining,
                'calculation' => $calc,
            ];
        });
    }

    /**
     * Generate depreciation schedule for an asset.
     */
    public function getDepreciationSchedule(array $data): array
    {
        $asset = DB::table('assets')->where('id', $data['asset_id'])->first();
        if (!$asset) {
            throw new \Exception('Asset not found.');
        }

        $cost = (float) ($asset->purchase_price ?? $asset->cost ?? 0);
        $residualValue = (float) ($asset->residual_value ?? 0);
        $usefulLife = (int) ($asset->useful_life ?? 1);
        $depreciableAmount = $cost - $residualValue;
        $annualDepreciation = round($depreciableAmount / max($usefulLife, 1), 2);

        $schedule = [];
        $accumulated = 0;
        $bookValue = $cost;

        for ($year = 1; $year <= $usefulLife; $year++) {
            if ($year === $usefulLife) {
                $dep = round($depreciableAmount - $accumulated, 2);
            } else {
                $dep = $annualDepreciation;
            }

            $accumulated += $dep;
            $bookValue -= $dep;

            $schedule[] = [
                'year' => $year,
                'opening_book_value' => round($bookValue + $dep, 2),
                'depreciation' => $dep,
                'accumulated_depreciation' => $accumulated,
                'closing_book_value' => round(max(0, $bookValue), 2),
            ];
        }

        return $schedule;
    }

    /**
     * Dispose an asset with gain/loss calculation.
     */
    public function disposeAsset(array $data): array
    {
        return DB::transaction(function () use ($data) {
            $asset = DB::table('assets')->where('id', $data['asset_id'])->first();
            if (!$asset) {
                throw new \Exception('Asset not found.');
            }

            $cost = (float) ($asset->purchase_price ?? $asset->cost ?? 0);
            $accumulatedDepreciation = (float) DB::table('asset_depreciations')
                ->where('asset_id', $asset->id)
                ->where('status', 'posted')
                ->sum('amount');

            $netBookValue = $cost - $accumulatedDepreciation;
            $proceeds = (float) ($data['disposal_proceeds'] ?? 0);
            $gainLoss = $proceeds - $netBookValue;

            DB::table('asset_disposals')->insert([
                'asset_id' => $asset->id,
                'disposal_date' => $data['disposal_date'],
                'disposal_type' => $data['disposal_type'] ?? 'sale',
                'disposal_proceeds' => $proceeds,
                'cost' => $cost,
                'accumulated_depreciation' => $accumulatedDepreciation,
                'net_book_value' => $netBookValue,
                'gain_loss' => $gainLoss,
                'reason' => $data['reason'] ?? null,
                'notes' => $data['notes'] ?? null,
                'status' => 'completed',
                'company_id' => auth()->user()->company_id ?? 1,
                'created_by' => auth()->id(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Mark asset as disposed
            DB::table('assets')->where('id', $asset->id)->update([
                'status' => 'disposed',
                'updated_at' => now(),
            ]);

            return [
                'asset_id' => $asset->id,
                'cost' => $cost,
                'accumulated_depreciation' => $accumulatedDepreciation,
                'net_book_value' => $netBookValue,
                'disposal_proceeds' => $proceeds,
                'gain_loss' => $gainLoss,
            ];
        });
    }

    /**
     * Record an asset movement (transfer between locations/departments).
     */
    public function moveAsset(array $data): array
    {
        return DB::transaction(function () use ($data) {
            $asset = DB::table('assets')->where('id', $data['asset_id'])->first();
            if (!$asset) {
                throw new \Exception('Asset not found.');
            }

            DB::table('asset_movements')->insert([
                'asset_id' => $asset->id,
                'movement_date' => $data['movement_date'],
                'from_warehouse_id' => $asset->warehouse_id ?? null,
                'to_warehouse_id' => $data['to_warehouse_id'] ?? null,
                'from_department_id' => $asset->department_id ?? null,
                'to_department_id' => $data['to_department_id'] ?? null,
                'from_employee_id' => $data['from_employee_id'] ?? null,
                'to_employee_id' => $data['to_employee_id'] ?? null,
                'reason' => $data['reason'] ?? null,
                'notes' => $data['notes'] ?? null,
                'status' => 'completed',
                'company_id' => auth()->user()->company_id ?? 1,
                'created_by' => auth()->id(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Update asset location
            $updateData = ['updated_at' => now()];
            if (!empty($data['to_warehouse_id'])) {
                $updateData['warehouse_id'] = $data['to_warehouse_id'];
            }
            if (!empty($data['to_department_id'])) {
                $updateData['department_id'] = $data['to_department_id'];
            }
            DB::table('assets')->where('id', $asset->id)->update($updateData);

            return ['message' => 'Asset movement recorded successfully.', 'asset_id' => $asset->id];
        });
    }
}
