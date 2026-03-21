<?php

namespace App\Services\Budget;

use App\Models\Budget\BudgetCommitment;
use App\Models\Budget\BudgetItem;
use Exception;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class BudgetCommitmentService
{
    /**
     * Create a new budget commitment.
     */
    public function createCommitment(array $data)
    {
        return DB::transaction(function () use ($data) {
            $this->validateBalance($data['budget_item_id'], $data['committed_amount']);

            $data['created_by'] = Auth::id();
            $data['status'] = 'active';
            $data['utilized_amount'] = 0;
            $data['remaining_amount'] = $data['committed_amount'];

            return BudgetCommitment::create($data);
        });
    }

    /**
     * Update an existing commitment (only if active).
     */
    public function updateCommitment(BudgetCommitment $commitment, array $data)
    {
        if ($commitment->status !== 'active') {
            throw new Exception('Only active commitments can be updated.');
        }

        return DB::transaction(function () use ($commitment, $data) {
            // If amount changed, check balance for the difference
            if (isset($data['committed_amount']) && $data['committed_amount'] > $commitment->committed_amount) {
                $diff = $data['committed_amount'] - $commitment->committed_amount;
                $this->validateBalance($commitment->budget_item_id, $diff);
            }

            $data['updated_by'] = Auth::id();

            // Recalculate remaining if committed amount changes
            if (isset($data['committed_amount'])) {
                $data['remaining_amount'] = $data['committed_amount'] - $commitment->utilized_amount;
                if ($data['remaining_amount'] < 0) {
                    throw new Exception('Committed amount cannot be less than already utilized amount.');
                }
            }

            $commitment->update($data);

            return $commitment;
        });
    }

    /**
     * Mark amount as utilized (e.g. from Invoice).
     */
    public function utilizeCommitment(BudgetCommitment $commitment, $amount)
    {
        return DB::transaction(function () use ($commitment, $amount) {
            if ($amount > $commitment->remaining_amount) {
                throw new Exception('Utilization amount exceeds remaining commitment.');
            }

            $commitment->utilized_amount += $amount;
            $commitment->remaining_amount -= $amount;

            if ($commitment->remaining_amount <= 0) {
                $commitment->status = 'fully_utilized';
            } else {
                $commitment->status = 'partially_utilized';
            }

            $commitment->save();

            return $commitment;
        });
    }

    /**
     * Cancel/Close commitment and release remaining funds.
     */
    public function cancelCommitment(BudgetCommitment $commitment)
    {
        return DB::transaction(function () use ($commitment) {
            if ($commitment->status === 'fully_utilized' || $commitment->status === 'cancelled') {
                throw new Exception('Commitment is already closed or cancelled.');
            }

            // We don't change committed_amount, we just mark it cancelled/closed.
            // The available balance calculation will ignore cancelled records,
            // but for 'closed' (manually finished early), we might want to consider remaining as free.
            // Let's assume 'cancelled' means voided.

            $commitment->status = 'cancelled';
            $commitment->save();

            return $commitment;
        });
    }

    /**
     * Close commitment manually (release remaining).
     */
    public function closeCommitment(BudgetCommitment $commitment)
    {
        return DB::transaction(function () use ($commitment) {
            if ($commitment->status === 'cancelled') {
                throw new Exception('Commitment is already cancelled.');
            }
            // Logic: Mark as completed/closed, remaining amount is released back to budget
            // We can set status to 'fully_utilized' or a specific 'closed' status.
            // The prompt says "Close Commitment". Let's use 'fully_utilized' or create a 'closed' status if strictly needed.
            // Prompt status flow: active, partially_utilized, fully_utilized, expired, cancelled.
            // 'fully_utilized' implies we spent it all. If we close with remaining, maybe 'cancelled' or just 'expired'?
            // Let's use 'cancelled' for now or just set remaining to 0.

            // Option: Reduce committed amount to equal utilized amount, effectively closing it.
            $commitment->committed_amount = $commitment->utilized_amount;
            $commitment->remaining_amount = 0;
            $commitment->status = 'fully_utilized'; // Effectively closed
            $commitment->save();

            return $commitment;
        });
    }

    /**
     * Validate sufficient funds.
     */
    public function validateBalance($budgetItemId, $amountNeeded)
    {
        $item = BudgetItem::findOrFail($budgetItemId);
        $available = $this->getAvailableBalance($item);

        if ($amountNeeded > $available) {
            throw new Exception('Insufficient budget balance. Available: '.number_format($available, 2));
        }
    }

    /**
     * Calculate available balance.
     * Available = Annual - Actual - Sum(Remaining Commitments)
     */
    public function getAvailableBalance(BudgetItem $item)
    {
        $reserved = BudgetCommitment::where('budget_item_id', $item->id)
            ->whereIn('status', ['active', 'partially_utilized'])
            ->sum('remaining_amount');

        // Note: BudgetTransfer logic used 'annual_amount - annual_actual'.
        // We must subtract reserved amounts too.

        return $item->annual_amount - $item->annual_actual - $reserved;
    }
}
