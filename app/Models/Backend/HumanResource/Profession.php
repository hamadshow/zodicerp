<?php

namespace App\Models\Backend\HumanResource;

use App\Models\Company;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $company_id
 * @property string $profession_name
 * @property string $profession_code
 */

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
        return $this->belongsTo(Company::class, 'company_id');
    }
}
