<?php

namespace Tests\Feature;

use App\Models\Backend\HumanResource\Profession;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class ProfessionCrudTest extends TestCase
{
    private array $professionIds = [];
    private array $userIds = [];
    private array $companyIds = [];
    private array $employeeIds = [];

    protected function setUp(): void
    {
        parent::setUp();

        if (DB::connection()->getDriverName() === 'sqlite') {
            $this->markTestSkipped('This test requires MySQL because the application middleware uses the production schema.');
        }

        $prefix = 'TEST-PROF-COMP-'.strtoupper(bin2hex(random_bytes(3)));
        for ($index = 1; $index <= 2; $index++) {
            $this->companyIds[] = DB::table('company')->insertGetId([
                'company_code' => "{$prefix}-{$index}",
                'company_name' => "Profession Test Company {$index}",
                'english_name' => "Profession Test Company {$index}",
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    protected function tearDown(): void
    {
        Profession::whereIn('id', $this->professionIds)->delete();
        DB::table('employees')->whereIn('id', $this->employeeIds)->delete();
        User::whereIn('id', $this->userIds)->delete();
        DB::table('company')->whereIn('id', $this->companyIds)->delete();
        parent::tearDown();
    }

    public function test_company_cannot_read_another_company_profession(): void
    {
        [$companyA, $companyB] = $this->companyIds;
        $user = $this->createAdmin($companyA);
        $profession = $this->createProfession($companyB, 'TEST-PROF-READ');

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/professions/'.$profession->id);

        $response->assertNotFound();
    }

    public function test_company_cannot_update_or_delete_another_company_profession(): void
    {
        [$companyA, $companyB] = $this->companyIds;
        $user = $this->createAdmin($companyA);
        $profession = $this->createProfession($companyB, 'TEST-PROF-MUTATE');
        $csrf = Str::random(40);

        $response = $this->actingAs($user, 'sanctum')
            ->withSession(['_token' => $csrf])
            ->withHeader('X-CSRF-TOKEN', $csrf)
            ->putJson('/api/professions/'.$profession->id, $this->payload('CHANGED'));
        $response->assertNotFound();

        $response = $this->actingAs($user, 'sanctum')
            ->withSession(['_token' => $csrf])
            ->withHeader('X-CSRF-TOKEN', $csrf)
            ->deleteJson('/api/professions/'.$profession->id);
        $response->assertNotFound();

        $this->assertDatabaseHas('professions', ['id' => $profession->id, 'company_id' => $companyB]);
    }

    public function test_company_id_tampering_is_rejected_and_does_not_change_ownership(): void
    {
        [$companyA, $companyB] = $this->companyIds;
        $user = $this->createAdmin($companyA);
        $csrf = Str::random(40);

        $response = $this->actingAs($user, 'sanctum')
            ->withSession(['_token' => $csrf])
            ->withHeader('X-CSRF-TOKEN', $csrf)
            ->postJson('/api/professions', $this->payload('TAMPER', ['company_id' => $companyB]));

        $response->assertUnprocessable()->assertJsonValidationErrors('company_id');
        $this->assertDatabaseMissing('professions', ['profession_code' => 'TEST-PROF-TAMPER']);
    }

    public function test_same_profession_code_is_allowed_for_different_companies(): void
    {
        [$companyA, $companyB] = $this->companyIds;
        $sharedCode = 'TEST-PROF-SHARED-'.strtoupper(bin2hex(random_bytes(2)));
        $first = $this->createProfession($companyA, $sharedCode, false);
        $second = $this->createProfession($companyB, $sharedCode, false);

        $this->assertNotSame($first->id, $second->id);
        $this->assertSame($sharedCode, $first->profession_code);
        $this->assertSame($sharedCode, $second->profession_code);
    }

    public function test_store_persists_the_profession_and_returns_the_generated_id(): void
    {
        [$companyA] = $this->companyIds;
        $user = $this->createAdmin($companyA);
        $csrf = Str::random(40);

        $response = $this->actingAs($user, 'sanctum')
            ->withSession(['_token' => $csrf])
            ->withHeader('X-CSRF-TOKEN', $csrf)
            ->postJson('/api/professions', $this->payload('CREATE'));

        $response->assertCreated();

        $createdId = $response->json('data.id');
        $this->assertIsNumeric($createdId);
        $this->assertGreaterThan(0, (int) $createdId);
        $this->professionIds[] = (int) $createdId;

        $this->assertDatabaseHas('professions', [
            'id' => $createdId,
            'company_id' => $companyA,
            'profession_code' => 'TEST-PROF-CREATE',
        ]);
    }

    public function test_index_is_paginated_and_scoped_to_the_authenticated_company(): void
    {
        [$companyA, $companyB] = $this->companyIds;
        $user = $this->createAdmin($companyA);
        $own = $this->createProfession($companyA, 'TEST-PROF-OWN');
        $other = $this->createProfession($companyB, 'TEST-PROF-OTHER');

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/professions?per_page=1&search=TEST-PROF');

        $response->assertOk()
            ->assertJsonPath('per_page', 1)
            ->assertJsonFragment(['id' => $own->id])
            ->assertJsonMissing(['id' => $other->id]);

        $this->assertNotNull($response->json('data.0.id'));
    }

    public function test_users_without_profession_permission_cannot_read_professions(): void
    {
        [$companyA] = $this->companyIds;
        $user = User::create([
            'username' => 'profession_test_user_'.uniqid(),
            'email' => 'profession_test_'.uniqid().'@test.com',
            'password' => bcrypt('password'),
            'role' => null,
            'company_id' => $companyA,
        ]);
        $this->userIds[] = $user->id;

        $this->actingAs($user, 'sanctum')->getJson('/api/professions')->assertForbidden();
    }

    public function test_invalid_salary_range_is_rejected(): void
    {
        [$companyA] = $this->companyIds;
        $user = $this->createAdmin($companyA);
        $csrf = Str::random(40);

        $response = $this->actingAs($user, 'sanctum')
            ->withSession(['_token' => $csrf])
            ->withHeader('X-CSRF-TOKEN', $csrf)
            ->postJson('/api/professions', $this->payload('SALARY', [
                'min_salary' => 2000,
                'max_salary' => 1000,
            ]));

        $response->assertUnprocessable()->assertJsonValidationErrors('max_salary');
    }

    public function test_profession_cannot_be_deleted_while_used_by_an_employee(): void
    {
        [$companyA] = $this->companyIds;
        $user = $this->createAdmin($companyA);
        $profession = $this->createProfession($companyA, 'TEST-PROF-USED');
        $employeeId = ((int) DB::table('employees')->max('id')) + 1;
        DB::table('employees')->insert([
            'id' => $employeeId,
            'name' => 'Profession Test Employee',
            'email' => 'profession_employee_'.uniqid().'@test.com',
            'password' => bcrypt('password'),
            'company_id' => $companyA,
            'position' => $profession->profession_name,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->employeeIds[] = $employeeId;
        $csrf = Str::random(40);

        $response = $this->actingAs($user, 'sanctum')
            ->withSession(['_token' => $csrf])
            ->withHeader('X-CSRF-TOKEN', $csrf)
            ->deleteJson('/api/professions/'.$profession->id);

        $response->assertStatus(409);
        $this->assertDatabaseHas('professions', ['id' => $profession->id]);
    }

    private function createAdmin(int $companyId): User
    {
        $user = User::create([
            'username' => 'profession_test_admin_'.uniqid(),
            'email' => 'profession_admin_'.uniqid().'@test.com',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'company_id' => $companyId,
        ]);
        $this->userIds[] = $user->id;

        return $user;
    }

    private function createProfession(int $companyId, string $code, bool $randomize = true): Profession
    {
        if ($randomize) {
            $code .= '-'.strtoupper(bin2hex(random_bytes(2)));
        }
        $id = ((int) DB::table('professions')->max('id')) + 1;
        DB::table('professions')->insert([
            'id' => $id,
            'company_id' => $companyId,
            'profession_name' => $code,
            'profession_code' => $code,
            'status' => 'active',
            'min_salary' => 0,
            'max_salary' => 0,
            'required_experience' => 0,
            'education_level' => 'Bachelor',
            'sort_order' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $profession = Profession::findOrFail($id);
        $this->professionIds[] = $profession->id;

        return $profession;
    }

    private function payload(string $suffix, array $extra = []): array
    {
        return array_merge([
            'profession_name' => 'Test Profession '.$suffix,
            'profession_code' => 'TEST-PROF-'.$suffix,
            'status' => 'active',
        ], $extra);
    }
}
