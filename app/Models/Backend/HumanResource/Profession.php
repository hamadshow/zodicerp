<?php

namespace App\Models\Backend\HumanResource;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Profession extends Model
{
    use HasFactory;

    protected $table = 'professions';

    protected $fillable = [
        'company_id',
        'profession_name',
        'profession_code',
        'category',
        'description',
        'min_salary',
        'max_salary',
        'required_experience',
        'education_level',
        'key_skills',
        'employees',
        'status',
        'sort_order',
    ];

    protected $casts = [
        'min_salary' => 'decimal:2',
        'max_salary' => 'decimal:2',
        'required_experience' => 'integer',
        'employees' => 'integer',
        'sort_order' => 'integer',
    ];

    /**
     * Get the company that owns the profession.
     */
    public function company()
    {
        // Adjust model path based on codebase structure
        if (class_exists('App\Models\Company')) {
            return $this->belongsTo(\App\Models\Company::class);
        }
        return $this->belongsTo(\App\Models\Backend\Company::class, 'company_id');
    }
}
