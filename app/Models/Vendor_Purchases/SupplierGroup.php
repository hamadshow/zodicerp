<?php

namespace App\Models\Vendor_Purchases;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Account;
use App\Models\User;

class SupplierGroup extends Model
{
    use HasFactory, SoftDeletes;

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
        'parent_id' => 'integer',
        'account_id' => 'integer',
        'payment_terms' => 'integer',
        'default_credit_limit' => 'decimal:2',
        'default_tax_id' => 'integer',
        'is_active' => 'boolean',
        'created_by' => 'integer',
    ];

    /**
     * Get the account associated with the supplier group.
     */
    public function account()
    {
        // Referenced to 'AccID' in accounts table based on known schema
        return $this->belongsTo(Account::class, 'account_id', 'AccID');
    }

    /**
     * Get the parent supplier group.
     */
    public function parent()
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    /**
     * Get the child supplier groups.
     */
    public function children()
    {
        return $this->hasMany(self::class, 'parent_id');
    }

    /**
     * Get the suppliers in this group.
     */
    public function suppliers()
    {
        return $this->hasMany(Supplier::class, 'supplier_group_id');
    }
    
    /**
     * Get the creator of the group.
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
