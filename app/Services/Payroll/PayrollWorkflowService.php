<?php

namespace App\Services\Payroll;

use App\Models\PayrollPeriod;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PayrollWorkflowService
{
    public function transition(PayrollPeriod|int $period, string $to, ?int $actorId = null): PayrollPeriod
    {
        return DB::transaction(function () use ($period, $to, $actorId): PayrollPeriod {
            $locked = PayrollPeriod::query()->lockForUpdate()->findOrFail($period instanceof PayrollPeriod ? $period->getKey() : $period);
            $from = $locked->status;
            $allowed = [
                'draft' => ['calculated'],
                'calculated' => ['reviewed'],
                'reviewed' => ['approved'],
                'approved' => ['posted'],
                'posted' => ['closed'],
            ];
            if (! in_array($to, $allowed[$from] ?? [], true)) {
                throw ValidationException::withMessages(['status' => "Cannot transition payroll period from {$from} to {$to}."]);
            }
            if ($to === 'reviewed' && ! $locked->results()->exists()) {
                throw ValidationException::withMessages(['status' => 'A payroll period must have at least one calculated result before review.']);
            }
            $data = ['status' => $to];
            if ($to === 'reviewed') {
                $data += ['reviewed_by' => $actorId, 'reviewed_at' => now()];
                $locked->results()->update(['reviewed_at' => now()]);
            } elseif ($to === 'approved') {
                $data += ['approved_by' => $actorId, 'approved_at' => now()];
                $locked->results()->update(['approved_at' => now()]);
            } elseif ($to === 'posted') {
                $data += ['posted_by' => $actorId, 'posted_at' => now()];
            } elseif ($to === 'closed') {
                $data += ['closed_by' => $actorId, 'closed_at' => now()];
            }
            $locked->update($data);
            return $locked->fresh('results');
        }, 3);
    }
}
