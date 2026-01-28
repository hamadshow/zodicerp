<?php

namespace App\Models\InvestingStack;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Sector extends Model
{
    use HasFactory;

    protected $table = 'sectors';

    protected $guarded = ['id'];

    protected $casts = [
        'is_active' => 'boolean',
        'level' => 'integer',
        'average_pe_ratio' => 'decimal:4',
        'average_dividend_yield' => 'decimal:4',
        'display_order' => 'integer',
    ];

    public function parent()
    {
        return $this->belongsTo(Sector::class, 'parent_sector_id');
    }

    public function children()
    {
        return $this->hasMany(Sector::class, 'parent_sector_id');
    }
}
