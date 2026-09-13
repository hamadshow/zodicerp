<?php

namespace App\Services\Vendor_Purchases;

use App\Models\Account;
use App\Models\Accounting\JournalEntry;
use App\Models\Accounting\JournalEntryLine;
use App\Models\Vendor_Purchases\LandedCost;
use App\Models\Vendor_Purchases\LandedCostAllocation;
use App\Services\Accounting\JournalReversalService;
use App\Services\Accounting\PostingService;
use App\Services\CompanyContext;
use App\Services\Inventory\WeightedAverageCostService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class LandedCostService
{
    public function __construct(
        private CompanyContext $companyContext,
        private WeightedAverageCostService $weightedAverageCost,
    ) {}

    public function preview(int $purchaseInvoiceId): array
    {
        $details = DB::table('purchase_invoice_details as pid')
            ->join('purchase_invoices as pi', 'pi.id', '=', 'pid.invoice_id')
            ->leftJoin('goods_receipt_details as grd', function ($join) {
                $join->on('grd.invoice_detail_id', '=', 'pid.id');
            })
            ->leftJoin('goods_receipts as gr', function ($join) {
                $join->on('gr.id', '=', 'grd.receipt_id')
                    ->where('gr.status', '=', 'approved')
                    ->whereNull('gr.deleted_at');
            })
            ->where('pi.id', $purchaseInvoiceId)
            ->where('pi.company_id', $this->companyContext->id())
            ->whereNull('pi.deleted_at')
            ->groupBy('pid.id', 'pid.product_id', 'pid.warehouse_id', 'pid.quantity', 'pid.unit_price', 'pid.discount_amount')
            ->select([
                'pid.id',
                'pid.product_id',
                'pid.warehouse_id',
                'pid.quantity',
                'pid.unit_price',
                'pid.discount_amount',
                DB::raw('COALESCE(SUM(CASE WHEN grd.is_accepted = 1 THEN grd.accepted_quantity ELSE 0 END), 0) as received_quantity'),
            ])
            ->get();

        $lines = [];
        $totalValue = '0.000000';
        foreach ($details as $detail) {
            $netUnit = $this->netUnitCost($detail);
            $eligibleValue = bcmul((string) $detail->received_quantity, $netUnit, 6);
            $totalValue = bcadd($totalValue, $eligibleValue, 6);
            $lines[] = [
                'purchase_invoice_detail_id' => (int) $detail->id,
                'product_id' => (int) $detail->product_id,
                'warehouse_id' => (int) $detail->warehouse_id,
                'received_quantity' => (string) $detail->received_quantity,
                'net_unit_cost' => $netUnit,
                'eligible_value' => $eligibleValue,
            ];
        }

        return ['lines' => $lines, 'total_eligible_value' => $totalValue];
    }

    public function allocate(LandedCost $landedCost): LandedCost
    {
        return DB::transaction(function () use ($landedCost) {
            $landedCost = LandedCost::query()->lockForUpdate()->findOrFail($landedCost->id);
            if ($landedCost->status === 'posted') {
                throw new RuntimeException('Posted Landed Costs cannot be reallocated.');
            }
            if ($landedCost->allocation_method !== 'value') {
                throw new RuntimeException('Only value allocation is supported.');
            }

            $preview = $this->preview((int) $landedCost->purchase_invoice_id);
            if (bccomp($preview['total_eligible_value'], '0', 6) <= 0) {
                throw new RuntimeException('No accepted received quantity is eligible for allocation.');
            }

            $remaining = (string) $landedCost->total_amount;
            $eligibleLines = array_values(array_filter($preview['lines'], fn ($line) => bccomp($line['eligible_value'], '0', 6) > 0));
            $lastIndex = count($eligibleLines) - 1;

            foreach ($eligibleLines as $index => $line) {
                $amount = $index === $lastIndex
                    ? $remaining
                    : bcdiv(bcmul((string) $landedCost->total_amount, $line['eligible_value'], 6), $preview['total_eligible_value'], 2);
                $remaining = bcsub($remaining, $amount, 2);

                $allocation = LandedCostAllocation::query()
                    ->where('landed_cost_id', $landedCost->id)
                    ->where('purchase_invoice_detail_id', $line['purchase_invoice_detail_id'])
                    ->first();
                if ($allocation) {
                    throw new RuntimeException('Duplicate Landed Cost allocation detected.');
                }

                $allocation = LandedCostAllocation::create([
                    'landed_cost_id' => $landedCost->id,
                    'company_id' => $this->companyContext->id(),
                    'purchase_invoice_detail_id' => $line['purchase_invoice_detail_id'],
                    'allocated_amount' => $amount,
                    'allocated_per_unit' => bcdiv($amount, $line['received_quantity'], 6),
                ]);

                $movementLineId = DB::table('inventory_movement_lines')
                    ->where('purchase_invoice_detail_id', $line['purchase_invoice_detail_id'])
                    ->value('id');
                if ($movementLineId) {
                    $allocation->update(['inventory_movement_line_id' => $movementLineId]);
                }
            }

            $landedCost->forceFill([
                'allocated_amount' => $landedCost->total_amount,
                'status' => 'allocated',
            ])->save();

            return $landedCost->fresh(['allocations']);
        });
    }

    public function post(LandedCost $landedCost): LandedCost
    {
        return DB::transaction(function () use ($landedCost) {
            $landedCost = LandedCost::query()->lockForUpdate()->with('allocations.purchaseInvoiceDetail')->findOrFail($landedCost->id);
            if ($landedCost->status === 'posted') {
                return $landedCost;
            }
            if ($landedCost->status !== 'allocated') {
                throw new RuntimeException('Landed Cost must be allocated before posting.');
            }
            if (! $landedCost->credit_source_type || ! $landedCost->credit_account_id) {
                throw new RuntimeException('A credit source and account are required.');
            }
            $this->validateCreditAccount((int) $landedCost->credit_account_id);

            $hasRemainingInventory = false;
            foreach ($landedCost->allocations as $allocation) {
                $detail = $allocation->purchaseInvoiceDetail;
                $balance = $this->weightedAverageCost->current((int) $detail->product_id, (int) $detail->warehouse_id);
                if (bccomp((string) $balance->quantity, '0', 6) > 0) {
                    $hasRemainingInventory = true;
                }
            }
            if (! $hasRemainingInventory) {
                throw new RuntimeException('Landed Cost cannot be posted without remaining eligible inventory.');
            }

            foreach ($landedCost->allocations as $allocation) {
                $detail = $allocation->purchaseInvoiceDetail;
                $this->weightedAverageCost->applyValueAdjustment(
                    (int) $detail->product_id,
                    (int) $detail->warehouse_id,
                    (string) $allocation->allocated_amount,
                    (string) $allocation->allocated_per_unit,
                    'landed_cost_allocation',
                    (int) $allocation->id,
                    (string) ($landedCost->posting_date ?: now()->toDateString()),
                    (int) $landedCost->id,
                );
            }

            $entryCode = $this->createJournal($landedCost);
            $landedCost->forceFill([
                'status' => 'posted',
                'posting_date' => $landedCost->posting_date ?: now()->toDateString(),
                'posted_journal_entry_code' => $entryCode,
            ])->save();
            app(PostingService::class)->recalculatePostings($this->companyContext->id());

            return $landedCost->fresh();
        });
    }

    public function cancel(LandedCost $landedCost): LandedCost
    {
        if ($landedCost->status === 'posted') {
            throw new RuntimeException('Posted Landed Costs require reversal.');
        }
        $landedCost->update(['status' => 'cancelled']);
        return $landedCost->fresh();
    }

    public function reverse(LandedCost $landedCost): LandedCost
    {
        return DB::transaction(function () use ($landedCost) {
            $landedCost = LandedCost::query()->lockForUpdate()->with('allocations.purchaseInvoiceDetail')->findOrFail($landedCost->id);
            if ($landedCost->status !== 'posted') {
                throw new RuntimeException('Only posted Landed Costs can be reversed.');
            }
            if ($landedCost->reversal_journal_entry_code) {
                return $landedCost;
            }

            $remainingCapitalized = '0.000000';
            foreach ($landedCost->allocations as $allocation) {
                $detail = $allocation->purchaseInvoiceDetail;
                $balance = $this->weightedAverageCost->current((int) $detail->product_id, (int) $detail->warehouse_id);
                $remaining = bccomp((string) $balance->inventory_value, (string) $allocation->allocated_amount, 6) < 0
                    ? (string) $balance->inventory_value
                    : (string) $allocation->allocated_amount;
                if (bccomp($remaining, '0', 6) > 0) {
                    $remainingCapitalized = bcadd($remainingCapitalized, $remaining, 6);
                    $this->weightedAverageCost->applyValueAdjustment(
                        (int) $detail->product_id,
                        (int) $detail->warehouse_id,
                        (string) -$remaining,
                        (string) $allocation->allocated_per_unit,
                        'landed_cost_reversal',
                        (int) $allocation->id,
                        now()->toDateString(),
                        (int) $landedCost->id,
                    );
                }
            }

            $consumed = bcsub((string) $landedCost->total_amount, $remainingCapitalized, 6);
            if (bccomp($consumed, '0', 6) > 0) {
                $this->createConsumedCostCorrection($landedCost, $consumed);
            }

            $reversal = app(JournalReversalService::class)->createReversal(
                (string) $landedCost->posted_journal_entry_code,
                'Landed Cost reversal - '.$landedCost->reference_number,
            );
            $landedCost->forceFill([
                'status' => 'cancelled',
                'reversal_journal_entry_code' => $reversal?->entry_code,
            ])->save();

            return $landedCost->fresh();
        });
    }

    private function createJournal(LandedCost $landedCost): string
    {
        $reference = $landedCost->reference_number;
        $existing = JournalEntry::query()->where('entry_type', 'LandedCost')->where('reference', $reference)->lockForUpdate()->first();
        $entryCode = $existing?->entry_code ?: 'LC-'.str_pad((string) $landedCost->id, 8, '0', STR_PAD_LEFT);
        $entry = $existing ?: JournalEntry::create([
            'entry_code' => $entryCode,
            'entry_type' => 'LandedCost',
            'reference' => $reference,
            'date' => $landedCost->posting_date ?: now()->toDateString(),
            'description' => 'Landed Cost '.$reference,
            'total_amount' => $landedCost->total_amount,
            'status' => 'Post',
            'company_id' => $this->companyContext->id(),
        ]);

        JournalEntryLine::where('journal_entry_code', $entry->entry_code)->delete();
        $inventoryAccountId = Account::where('AccCode', '11401')->value('AccID');
        if (! $inventoryAccountId) {
            throw new RuntimeException('Inventory Asset account 11401 is not configured.');
        }
        foreach ([
            ['account_id' => $inventoryAccountId, 'debit' => $landedCost->total_amount, 'credit' => 0, 'description' => 'Inventory capitalization - '.$reference],
            ['account_id' => $landedCost->credit_account_id, 'debit' => 0, 'credit' => $landedCost->total_amount, 'description' => 'Landed Cost source - '.$reference],
        ] as $line) {
            JournalEntryLine::create(array_merge($line, [
                'journal_entry_code' => $entry->entry_code,
                'related_id_name' => 'LandedCost',
                'related_name_details' => $reference,
                'company_id' => $this->companyContext->id(),
            ]));
        }

        return $entry->entry_code;
    }

    private function createConsumedCostCorrection(LandedCost $landedCost, string $amount): void
    {
        $inventoryAccountId = Account::where('AccCode', '11401')->value('AccID');
        $cogsAccountId = Account::where('AccCode', 'like', '5%')->where('AccType', 1)->orderBy('AccCode')->value('AccID');
        if (! $inventoryAccountId || ! $cogsAccountId) {
            throw new RuntimeException('Inventory or COGS account is not configured for Landed Cost reversal correction.');
        }

        $entryCode = 'LC-'.str_pad((string) $landedCost->id, 8, '0', STR_PAD_LEFT).'-COGS';
        $entry = JournalEntry::firstOrCreate(
            ['entry_code' => $entryCode],
            [
                'entry_type' => 'LandedCostReversalCorrection',
                'reference' => $landedCost->reference_number,
                'date' => now()->toDateString(),
                'description' => 'Landed Cost consumed-cost correction - '.$landedCost->reference_number,
                'total_amount' => $amount,
                'status' => 'Post',
                'company_id' => $this->companyContext->id(),
            ],
        );
        JournalEntryLine::where('journal_entry_code', $entry->entry_code)->delete();
        foreach ([
            ['account_id' => $inventoryAccountId, 'debit' => $amount, 'credit' => 0, 'description' => 'Reverse consumed Landed Cost inventory effect'],
            ['account_id' => $cogsAccountId, 'debit' => 0, 'credit' => $amount, 'description' => 'Reverse consumed Landed Cost COGS effect'],
        ] as $line) {
            JournalEntryLine::create(array_merge($line, [
                'journal_entry_code' => $entry->entry_code,
                'related_id_name' => 'LandedCostReversalCorrection',
                'related_name_details' => $landedCost->reference_number,
                'company_id' => $this->companyContext->id(),
            ]));
        }
    }

    private function validateCreditAccount(int $accountId): void
    {
        $account = Account::query()->where('AccID', $accountId)->first();
        if (! $account) {
            throw new RuntimeException('Selected credit account does not exist.');
        }
        if (isset($account->company_id) && $account->company_id && (int) $account->company_id !== $this->companyContext->id()) {
            throw new RuntimeException('Selected credit account belongs to another company.');
        }
    }

    private function netUnitCost($detail): string
    {
        $quantity = (string) $detail->quantity;
        if (bccomp($quantity, '0', 6) <= 0) {
            throw new RuntimeException('Invoice quantity must be greater than zero.');
        }
        return bcsub((string) $detail->unit_price, bcdiv((string) ($detail->discount_amount ?? '0'), $quantity, 6), 6);
    }
}