<?php

namespace App\Models\Assets;

use App\Models\Account;
use App\Models\Currency;
use App\Models\Employee;
use App\Models\ItemUnit;
use App\Models\User;
use App\Models\Vendor_Purchases\PurchaseTax;
use App\Models\Warehouses;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Asset extends Model
{
    use HasFactory;

    protected $table = 'assets';

    protected $fillable = [
        'asset_number',
        'serial_number',
        'barcode',
        'name_ar',
        'name_en',
        'description',
        'category_id',
        'unit_id',
        'currency_id',
        'quantity',
        'unit_cost',
        'total_cost',
        'purchase_date',
        'activation_date',
        'warranty_expiry',
        'salvage_value',
        'current_value',
        'accumulated_depreciation',
        'net_book_value',
        'warehouse_id',
        'department_id',
        'employee_id',
        'location_description',
        'status',
        'condition',
        'inventory_account_id',
        'tax_id',
        'tax_amount',
        'image_path',
        'specifications',
        'depreciation_start_date',
        'is_depreciable',
        'depreciation_method',
        'useful_life_years',
        'depreciation_rate',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'quantity' => 'decimal:3',
        'unit_cost' => 'decimal:4',
        'total_cost' => 'decimal:4',
        'purchase_date' => 'date',
        'activation_date' => 'date',
        'warranty_expiry' => 'date',
        'salvage_value' => 'decimal:4',
        'current_value' => 'decimal:4',
        'accumulated_depreciation' => 'decimal:4',
        'net_book_value' => 'decimal:4',
        'tax_amount' => 'decimal:4',
        'specifications' => 'array',
        'depreciation_start_date' => 'date',
        'is_depreciable' => 'boolean',
        'useful_life_years' => 'decimal:2',
        'depreciation_rate' => 'decimal:2',
    ];

    public function category()
    {
        return $this->belongsTo(AssetCategory::class, 'category_id');
    }

    public function unit()
    {
        return $this->belongsTo(ItemUnit::class, 'unit_id');
    }

    public function currency()
    {
        return $this->belongsTo(Currency::class, 'currency_id');
    }

    public function warehouse()
    {
        return $this->belongsTo(Warehouses::class, 'warehouse_id');
    }

    public function department()
    {
        return $this->belongsTo(Department::class, 'department_id');
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }

    public function inventoryAccount()
    {
        return $this->belongsTo(Account::class, 'inventory_account_id', 'AccID');
    }

    public function tax()
    {
        return $this->belongsTo(PurchaseTax::class, 'tax_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function editor()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function attributes()
    {
        return $this->hasMany(AssetAttribute::class, 'asset_id');
    }

    public function depreciations()
    {
        return $this->hasMany(AssetDepreciation::class, 'asset_id');
    }

    public function revaluations()
    {
        return $this->hasMany(AssetRevaluation::class, 'asset_id');
    }

    public function disposals()
    {
        return $this->hasOne(AssetDisposal::class, 'asset_id');
    }

    public function maintenances()
    {
        return $this->hasMany(AssetMaintenance::class, 'asset_id');
    }

    public function movements()
    {
        return $this->hasMany(AssetMovement::class, 'asset_id');
    }

    public function inspections()
    {
        return $this->hasMany(AssetInspection::class, 'asset_id');
    }
}
