<?php

namespace App\Policies;

use App\Models\Backend\HumanResource\Profession;
use App\Models\Employee;
use App\Models\User;

class ProfessionPolicy
{
    public function viewAny(User|Employee $user): bool
    {
        return $user->hasPermission('professions.view');
    }

    public function view(User|Employee $user, Profession $profession): bool
    {
        return $user->hasPermission('professions.view') && $this->owns($user, $profession);
    }

    public function create(User|Employee $user): bool
    {
        return $user->hasPermission('professions.create');
    }

    public function update(User|Employee $user, Profession $profession): bool
    {
        return $user->hasPermission('professions.update') && $this->owns($user, $profession);
    }

    public function delete(User|Employee $user, Profession $profession): bool
    {
        return $user->hasPermission('professions.delete') && $this->owns($user, $profession);
    }

    private function owns(User|Employee $user, Profession $profession): bool
    {
        return (int) $user->company_id === (int) $profession->company_id;
    }
}
