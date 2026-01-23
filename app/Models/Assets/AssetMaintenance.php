<?php

namespace App\Models\Assets;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AssetMaintenance extends Model
{
    use HasFactory;

    protected $table = 'asset_maintenance';

    protected $fillable = [
        'asset_id',
        'maintenance_type',
        'request_date',
        'schedule_date',
        'start_date',
        'completion_date',
        'maintenance_code',
        'title_ar',
        'title_en',
        'description',
        'assigned_to',
        'vendor_id',
        'estimated_cost',
        'actual_cost',
        'currency_id',
        'status',
        'priority',
        'findings',
        'actions_taken',
        'parts_replaced',
        'next_maintenance_date',
        'requested_by',
        'approved_by',
        'completed_by',
    ];

    protected $casts = [
        'request_date' => 'date',
        'schedule_date' => 'date',
        'start_date' => 'date',
        'completion_date' => 'date',
        'estimated_cost' => 'decimal:4',
        'actual_cost' => 'decimal:4',
        'next_maintenance_date' => 'date',
    ];

    public function asset()
    {
        return $this->belongsTo(Asset::class);
    }

    public function vendor()
    {
        // Dynamic relationship based on table existence or configuration could be better,
        // but for now we assume it links to Supplier model if vendors table is not explicit model.
        // If we have a Vendor model, use it. If not, use Supplier.
        // We'll use Supplier model as 'vendors' usually maps to 'suppliers' in this system based on search.
        return $this->belongsTo(\App\Models\Vendor_Purchases\Supplier::class, 'vendor_id');
    }

    public function currency()
    {
        return $this->belongsTo(\App\Models\Currency::class, 'currency_id');
    }

    public function requester()
    {
        return $this->belongsTo(\App\Models\User::class, 'requested_by');
    }

    public function approver()
    {
        return $this->belongsTo(\App\Models\User::class, 'approved_by');
    }

    public function completer()
    {
        return $this->belongsTo(\App\Models\User::class, 'completed_by');
    }
}
