<?php

namespace App\Models;

use App\Models\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;

class Location extends Model
{
    use HasFactory, SoftDeletes, BelongsToCompany;

    protected $fillable = [
        'parent_id',
        'name_json',
        'location_type',
        'code',
        'status',
        'sort_order',
        'metadata',
        'company_id',
    ];

    protected $casts = [
        'name_json' => 'array',
        'metadata' => 'array',
        'status' => 'boolean',
    ];

    protected $appends = ['name'];

    /**
     * Relationships
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(Location::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(Location::class, 'parent_id')->orderBy('sort_order');
    }

    /**
     * Accessors
     */
    public function getNameAttribute(): string
    {
        $locale = app()->getLocale();
        return $this->name_json[$locale] ?? ($this->name_json['en'] ?? ($this->name_json['ar'] ?? ''));
    }

    public function getPathAttribute(): string
    {
        $path = [$this->name];
        $parent = $this->parent;
        
        while ($parent) {
            array_unshift($path, $parent->name);
            $parent = $parent->parent;
        }
        
        return implode(' > ', $path);
    }

    /**
     * Scopes
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', true);
    }

    public function scopeByType(Builder $query, string $type): Builder
    {
        return $query->where('location_type', $type);
    }

    /**
     * Helper to generate hierarchical code
     */
    public static function generateCode(?int $parentId = null): string
    {
        $parent = self::find($parentId);
        $parentCode = $parent ? $parent->code . '-' : '';
        
        $lastChild = self::where('parent_id', $parentId)
            ->orderBy('id', 'desc')
            ->first();
            
        $nextNum = 1;
        if ($lastChild) {
            $parts = explode('-', $lastChild->code);
            $nextNum = (int) end($parts) + 1;
        }
        
        return $parentCode . str_pad($nextNum, 2, '0', STR_PAD_LEFT);
    }
}
