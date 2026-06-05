<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'username',
        'email',
        'password',
        'role',
        'fullname',
        'phone',
        'hire_date',
        'status',
        'avatar',
        'company_id',
    ];

    protected $appends = [
        'name',
    ];

    public function getNameAttribute(): ?string
    {
        return $this->attributes['username'] ?? null;
    }

    public function setNameAttribute($value): void
    {
        $this->attributes['username'] = $value;
    }

    /**
     * Get the validation rules for the role field.
     */
    public static function getRoleValidationRules(): array
    {
        return [
            'role' => 'nullable|string|max:255',
        ];
    }

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'company_id' => 'integer',
        ];
    }

    /**
     * Check if the user has a specific role.
     */
    public function hasRole(string $role): bool
    {
        if ($this->role === $role) {
            return true;
        }

        return $this->roles()->where('slug', $role)->exists();
    }

    /**
     * Check if the user has a specific permission.
     */
    public function hasPermission(string $permission): bool
    {
        // System users (Super Admin, etc.) have full access
        $systemRoles = ['admin', 'superadmin', 'super_admin', 'owner', 'developer', 'programmer', 'technical_administrator'];
        if (in_array(strtolower($this->role), $systemRoles)) {
            return true;
        }

        foreach ($this->roles as $role) {
            if (is_array($role->permissions) && $this->checkPermissionInArray($permission, $role->permissions)) {
                return true;
            }
        }

        return false;
    }

    private function checkPermissionInArray($permission, $permissionsArray)
    {
        // The permissions array structure: { group: { resource: [actions] } }
        // Permission string format: "resource.action" (e.g., "employees.view")
        if (str_contains($permission, '.')) {
            [$targetResource, $targetAction] = explode('.', strtolower($permission));
            
            foreach ($permissionsArray as $group => $resources) {
                foreach ($resources as $resource => $actions) {
                    $normalizedResource = str_replace(' ', '_', strtolower($resource));
                    if ($normalizedResource === $targetResource) {
                        foreach ($actions as $action) {
                            if (strtolower($action) === $targetAction) {
                                return true;
                            }
                        }
                    }
                }
            }
        }
        return false;
    }

    /**
     * Get the roles associated with the user.
     */
    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'role_users');
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'company_id');
    }
}
