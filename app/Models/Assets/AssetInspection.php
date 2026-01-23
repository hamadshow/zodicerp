<?php

namespace App\Models\Assets;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\User;

class AssetInspection extends Model
{
    use HasFactory;

    protected $table = 'asset_inspections';

    protected $fillable = [
        'asset_id',
        'inspection_date',
        'inspector_name',
        'condition_before',
        'condition_after',
        'findings',
        'recommendations',
        'next_inspection_date',
        'is_maintenance_required',
        'maintenance_id',
        'created_by',
    ];

    protected $casts = [
        'inspection_date' => 'date',
        'next_inspection_date' => 'date',
        'is_maintenance_required' => 'boolean',
    ];

    public function asset()
    {
        return $this->belongsTo(Asset::class);
    }

    public function maintenance()
    {
        return $this->belongsTo(AssetMaintenance::class, 'maintenance_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
