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

        if (!Currency::whereKey(1)->exists() && Currency::count() === 0) {
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

        if (!User::where('email', 'system.admin@company.com')->exists()) {
            User::factory()->create([
                'name' => 'System Admin',
                'email' => 'system.admin@company.com',
                'role' => 'admin',
            ]);
        }

        if (!User::where('email', 'supplier.user@company.com')->exists()) {
            User::factory()->create([
                'name' => 'Supplier User',
                'email' => 'supplier.user@company.com',
                'role' => 'supplier',
            ]);
        }

        if (!User::where('email', 'customer.user@company.com')->exists()) {
            User::factory()->create([
                'name' => 'Customer User',
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
                'first_name' => 'Ahmed',
                'last_name' => 'Mohamed',
                'email' => 'ahmed.mohamed@company.com',
                'password' => \Illuminate\Support\Facades\Hash::make('password'),
                'phone' => '+201234567890',
                'department' => 'it',
                'position' => 'Software Engineer',
                'hire_date' => '2023-01-15',
                'salary' => 5000,
                'nationality' => 'egyptian',
                'status' => 'active',
                'address' => 'Cairo, Egypt',
                'notes' => 'Excellent performance',
                'role' => 'admin',
                'name' => 'Ahmed Mohamed',
            ],
            [
                'first_name' => 'Sarah',
                'last_name' => 'Johnson',
                'email' => 'sarah.j@company.com',
                'password' => \Illuminate\Support\Facades\Hash::make('password'),
                'phone' => '+12025550123',
                'department' => 'hr',
                'position' => 'HR Manager',
                'hire_date' => '2022-03-10',
                'salary' => 6500,
                'nationality' => 'american',
                'status' => 'active',
                'address' => 'New York, USA',
                'notes' => '',
                'role' => 'admin',
                'name' => 'Sarah Johnson',
            ],
            [
                'first_name' => 'James',
                'last_name' => 'Wilson',
                'email' => 'james.w@company.com',
                'password' => \Illuminate\Support\Facades\Hash::make('password'),
                'phone' => '+442012345678',
                'department' => 'sales',
                'position' => 'Sales Director',
                'hire_date' => '2021-11-20',
                'salary' => 8000,
                'nationality' => 'british',
                'status' => 'active',
                'address' => 'London, UK',
                'notes' => 'Top performer',
                'role' => 'admin',
                'name' => 'James Wilson',
            ],
            [
                'first_name' => 'Fatima',
                'last_name' => 'Al-Mansour',
                'email' => 'fatima.am@company.com',
                'password' => \Illuminate\Support\Facades\Hash::make('password'),
                'phone' => '+966501234567',
                'department' => 'marketing',
                'position' => 'Marketing Specialist',
                'hire_date' => '2023-06-05',
                'salary' => 4500,
                'nationality' => 'saudi',
                'status' => 'active',
                'address' => 'Riyadh, Saudi Arabia',
                'notes' => '',
                'role' => 'admin',
                'name' => 'Fatima Al-Mansour',
            ],
        ];

        foreach ($employees as $employee) {
            if (!User::where('email', $employee['email'])->exists()) {
                User::create($employee);
            }
        }

        if (!User::where('email', 'ah.elshrif10@gmail.com')->exists()) {
            User::create([
                'name' => 'Admin',
                'email' => 'ah.elshrif10@gmail.com',
                'password' => \Illuminate\Support\Facades\Hash::make('$h0W198515'),
                'role' => 'admin',
                'status' => 'active',
            ]);
        }
    }
}
