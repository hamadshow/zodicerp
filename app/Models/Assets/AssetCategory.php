<?php

namespace App\Models\Assets;

use App\Models\Account;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AssetCategory extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'asset_categories';

    protected $fillable = [
        'parent_id',
        'code',
        'name_ar',
        'name_en',
        'description',
        'depreciation_method',
        'useful_life_years',
        'salvage_value_rate',
        'account_purchase_id',
        'account_depreciation_id',
        'account_accumulated_depreciation_id',
        'account_disposal_gain_id',
        'account_disposal_loss_id',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'useful_life_years' => 'decimal:2',
        'salvage_value_rate' => 'decimal:2',
    ];

    public function parent()
    {
        return $this->belongsTo(AssetCategory::class, 'parent_id');
    }

    public function children()
    {
        return $this->hasMany(AssetCategory::class, 'parent_id');
    }

    public function purchaseAccount()
    {
        return $this->belongsTo(Account::class, 'account_purchase_id', 'AccID');
    }

    public function depreciationAccount()
    {
        return $this->belongsTo(Account::class, 'account_depreciation_id', 'AccID');
    }

    public function accumulatedDepreciationAccount()
    {
        return $this->belongsTo(Account::class, 'account_accumulated_depreciation_id', 'AccID');
    }

    public function disposalGainAccount()
    {
        return $this->belongsTo(Account::class, 'account_disposal_gain_id', 'AccID');
    }

    public function disposalLossAccount()
    {
        return $this->belongsTo(Account::class, 'account_disposal_loss_id', 'AccID');
    }
}
