<?php

namespace App\Models\Vendor_Purchases;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\User;

class SupplierGroup extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'supplier_groups';

    protected $fillable = [
        'code',
        'name_ar',
        'name_en',
        'parent_id',
        'account_id',
        'payment_terms',
        'default_credit_limit',
        'default_tax_id',
        'notes',
        'is_active',
        'created_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'default_credit_limit' => 'decimal:2',
        'payment_terms' => 'integer',
        'account_id' => 'integer',
        'parent_id' => 'integer',
        'default_tax_id' => 'integer',
    ];

    public function parent()
    {
        return $this->belongsTo(SupplierGroup::class, 'parent_id');
    }

    public function children()
    {
        return $this->hasMany(SupplierGroup::class, 'parent_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
