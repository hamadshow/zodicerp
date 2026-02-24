<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Language extends Model
{
    protected $table = 'languages';
    protected $primaryKey = 'lang_id';

    protected $fillable = [
        'lang_name',
        'lang_locale',
        'lang_code',
        'lang_flag',
        'lang_is_default',
        'lang_order',
        'lang_is_rtl',
    ];

    protected $casts = [
        'lang_is_default' => 'integer',
        'lang_is_rtl' => 'integer',
        'lang_order' => 'integer',
    ];
}
