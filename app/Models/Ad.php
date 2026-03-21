<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Ad extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'expired_at',
        'location',
        'key',
        'image',
        'url',
        'clicked',
        'order',
        'status',
        'open_in_new_tab',
        'tablet_image',
        'mobile_image',
        'ads_type',
        'google_adsense_slot_id',
    ];

    protected $casts = [
        'expired_at' => 'datetime',
        'open_in_new_tab' => 'boolean',
        'clicked' => 'integer',
        'order' => 'integer',
    ];
}
