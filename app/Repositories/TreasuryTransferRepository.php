<?php

namespace App\Repositories;

use App\Models\TreasuryTransfer;
use Illuminate\Support\Facades\DB;

class TreasuryTransferRepository
{
    public function getAll($filters = [])
    {
        return TreasuryTransfer::query()
            ->with(['creator'])
            ->when($filters['search'] ?? null, function ($query, $search) {
                $query->where('reference_number', 'like', "%{$search}%")
                    ->orWhere('notes', 'like', "%{$search}%");
            })
            ->when($filters['status'] ?? null, function ($query, $status) {
                if ($status !== 'all') {
                    $query->where('status', $status);
                }
            })
            ->when($filters['date_from'] ?? null, function ($query, $date) {
                $query->whereDate('transfer_date', '>=', $date);
            })
            ->when($filters['date_to'] ?? null, function ($query, $date) {
                $query->whereDate('transfer_date', '<=', $date);
            })
            ->orderBy('id', 'desc')
            ->paginate($filters['per_page'] ?? 15);
    }

    public function findById($id)
    {
        return TreasuryTransfer::with(['creator', 'approver', 'rejector'])->findOrFail($id);
    }

    public function create(array $data)
    {
        return TreasuryTransfer::create($data);
    }

    public function update($id, array $data)
    {
        $transfer = $this->findById($id);
        $transfer->update($data);
        return $transfer;
    }

    public function delete($id)
    {
        $transfer = $this->findById($id);
        return $transfer->delete();
    }
}
