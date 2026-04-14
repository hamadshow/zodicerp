<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FinancialReport extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id',
        'report_key',
        'report_name',
        'description',
        'category',
        'route_name',
        'icon',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function favorites()
    {
        return $this->hasMany(UserFavoriteReport::class, 'report_id');
    }
}
