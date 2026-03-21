<?php

namespace Database\Seeders;

use App\Models\Currency;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        if (! Currency::whereKey(1)->exists() && Currency::count() === 0) {
            Currency::query()->insert([
                'id' => 1,
                'code' => 'EGP',
                'name' => 'Egyptian Pound',
                'symbol' => 'E£',
                'decimal_places' => 2,
                'format' => null,
                'is_base' => true,
                'status' => 'active',
                'created_by' => null,
                'updated_by' => null,
                'deleted_at' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        if (! User::where('email', 'system.admin@company.com')->exists()) {
            User::factory()->create([
                'username' => 'System Admin',
                'fullname' => 'System Admin',
                'email' => 'system.admin@company.com',
                'role' => 'admin',
            ]);
        }

        if (! User::where('email', 'supplier.user@company.com')->exists()) {
            User::factory()->create([
                'username' => 'Supplier User',
                'fullname' => 'Supplier User',
                'email' => 'supplier.user@company.com',
                'role' => 'supplier',
            ]);
        }

        if (! User::where('email', 'customer.user@company.com')->exists()) {
            User::factory()->create([
                'username' => 'Customer User',
                'fullname' => 'Customer User',
                'email' => 'customer.user@company.com',
                'role' => 'customer',
            ]);
        }

        $this->call([
            LocationSeeder::class,
            TaskSeeder::class,
            FinancialReportsSeeder::class,
        ]);

        // Create sample employees
        $employees = [
            [
                'email' => 'ahmed.mohamed@company.com',
                'password' => \Illuminate\Support\Facades\Hash::make('password'),
                'phone' => '+201234567890',
                'hire_date' => '2023-01-15',
                'status' => 'active',
                'role' => 'admin',
                'username' => 'Ahmed Mohamed',
                'fullname' => 'Ahmed Mohamed',
            ],
            [
                'email' => 'sarah.j@company.com',
                'password' => \Illuminate\Support\Facades\Hash::make('password'),
                'phone' => '+12025550123',
                'hire_date' => '2022-03-10',
                'status' => 'active',
                'role' => 'admin',
                'username' => 'Sarah Johnson',
                'fullname' => 'Sarah Johnson',
            ],
            [
                'email' => 'james.w@company.com',
                'password' => \Illuminate\Support\Facades\Hash::make('password'),
                'phone' => '+442012345678',
                'hire_date' => '2021-11-20',
                'status' => 'active',
                'role' => 'admin',
                'username' => 'James Wilson',
                'fullname' => 'James Wilson',
            ],
            [
                'email' => 'fatima.am@company.com',
                'password' => \Illuminate\Support\Facades\Hash::make('password'),
                'phone' => '+966501234567',
                'hire_date' => '2023-06-05',
                'status' => 'active',
                'role' => 'admin',
                'username' => 'Fatima Al-Mansour',
                'fullname' => 'Fatima Al-Mansour',
            ],
        ];

        foreach ($employees as $employee) {
            if (! User::where('email', $employee['email'])->exists()) {
                User::create($employee);
            }
        }

        User::updateOrCreate(
            ['email' => 'ah.elshrif10@gmail.com'],
            [
                'username' => 'SuperAdmin',
                'fullname' => 'SuperAdmin',
                'password' => \Illuminate\Support\Facades\Hash::make('$h0W198515'),
                'role' => 'admin',
                'status' => 'active',
            ]
        );
    }
}
