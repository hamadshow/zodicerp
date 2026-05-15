<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class JobApplication extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'email',
        'phone',
        'career_id',
        'cv_path',
        'message',
        'status',
        'gender',
        'age',
        'nationality',
        'country',
        'city',
        'area',
        'qualification',
        'specialization',
        'experience_years',
        'shift_type',
        'expected_salary',
        'availability_date',
        'certificates_path',
    ];

    public function career()
    {
        return $this->belongsTo(Career::class);
    }
}
