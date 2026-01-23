<?php

namespace App\Models\Vendor_Purchases;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class SupplierContact extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'supplier_id',
        'name_ar',
        'name_en',
        'position_ar',
        'position_en',
        'department',
        'phone',
        'mobile',
        'email',
        'whatsapp',
        'is_primary',
        'receive_statements',
        'receive_notifications',
        'notes',
    ];

    protected $casts = [
        'supplier_id' => 'integer',
        'is_primary' => 'boolean',
        'receive_statements' => 'boolean',
        'receive_notifications' => 'boolean',
    ];

    public function supplier()
    {
        return $this->belongsTo(Supplier::class, 'supplier_id');
    }
}
