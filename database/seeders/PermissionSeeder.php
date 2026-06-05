<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Http\Controllers\Backend\Settings\RoleController;
use Illuminate\Database\Seeder;

class PermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $permissions = RoleController::PERMISSIONS;

        foreach ($permissions as $group => $resources) {
            foreach ($resources as $resource => $actions) {
                foreach ($actions as $action) {
                    $name = strtolower($resource) . '.' . $action;
                    $name = str_replace(' ', '_', $name);

                    Permission::updateOrCreate(
                        ['name' => $name],
                        [
                            'display_name' => ucfirst($action) . ' ' . $resource,
                            'group' => $group,
                            'description' => "Allows $action on $resource",
                            'status' => 'active',
                        ]
                    );
                }
            }
        }
    }
}
