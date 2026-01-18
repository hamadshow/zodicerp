<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserFavoriteReport extends Model
{
    use HasFactory;

    protected $table = 'user_favorite_reports';

    protected $fillable = [
        'user_id',
        'report_id',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function report()
    {
        return $this->belongsTo(FinancialReport::class, 'report_id');
    }
}

