<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Career extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'location',
        'type',
        'description',
        'requirements',
        'responsibilities',
        'salary_range',
        'is_active',
        'company_id',
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
    ];

    public function applications()
    {
        return $this->hasMany(JobApplication::class);
    }
}
