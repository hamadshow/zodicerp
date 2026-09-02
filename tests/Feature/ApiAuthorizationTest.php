<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ApiAuthorizationTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        if (DB::connection()->getDriverName() === 'sqlite') {
            $this->markTestSkipped('This test requires a MySQL database (SQLite in-memory cannot run full middleware stack).');
        }
    }

    private function createUserWithRole(string $role): User
    {
        return User::create([
            'username' => 'admin_' . uniqid(),
            'email' => 'admin_' . uniqid() . '@test.com',
            'password' => bcrypt('password'),
            'role' => $role,
            'company_id' => 1,
        ]);
    }

    private function createRegularUser(): User
    {
        return User::create([
            'username' => 'regular_' . uniqid(),
            'email' => 'regular_' . uniqid() . '@test.com',
            'password' => bcrypt('password'),
            'role' => null,
            'company_id' => 1,
        ]);
    }

    // ========================================
    // AUTHENTICATION TESTS
    // ========================================

    /** @test */
    public function unauthenticated_api_request_is_denied()
    {
        $response = $this->getJson('/api/users');
        $response->assertStatus(401);
    }

    /** @test */
    public function unauthenticated_api_post_is_denied()
    {
        $response = $this->postJson('/api/products', ['name' => 'Test']);
        $response->assertStatus(401);
    }

    // ========================================
    // REGISTRATION DISABLED TEST
    // ========================================

    /** @test */
    public function api_register_endpoint_returns_404()
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $response->assertStatus(404);
    }

    // ========================================
    // SYSTEM ROLE BYPASS TESTS
    // ========================================

    /** @test */
    public function system_admin_can_access_users_endpoint()
    {
        $admin = $this->createUserWithRole('admin');

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/users');

        $this->assertNotEquals(403, $response->getStatus());
    }

    /** @test */
    public function system_superadmin_can_access_products_endpoint()
    {
        $admin = $this->createUserWithRole('superadmin');

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/products');

        $this->assertNotEquals(403, $response->getStatus());
    }

    /** @test */
    public function system_owner_can_access_accounts_endpoint()
    {
        $admin = $this->createUserWithRole('owner');

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/accounts');

        $this->assertNotEquals(403, $response->getStatus());
    }

    /** @test */
    public function system_developer_can_access_journals_endpoint()
    {
        $admin = $this->createUserWithRole('developer');

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/journals');

        $this->assertNotEquals(403, $response->getStatus());
    }

    // ========================================
    // NON-ADMIN USER DENIAL TESTS
    // ========================================

    /** @test */
    public function regular_user_without_role_is_denied_from_users_endpoint()
    {
        $user = $this->createRegularUser();

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/users');

        $response->assertStatus(403);
    }

    /** @test */
    public function regular_user_without_role_is_denied_from_products_endpoint()
    {
        $user = $this->createRegularUser();

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/products');

        $response->assertStatus(403);
    }

    /** @test */
    public function regular_user_without_role_is_denied_from_orders_endpoint()
    {
        $user = $this->createRegularUser();

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/orders');

        $response->assertStatus(403);
    }

    /** @test */
    public function regular_user_without_role_is_denied_from_accounts_endpoint()
    {
        $user = $this->createRegularUser();

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/accounts');

        $response->assertStatus(403);
    }

    /** @test */
    public function regular_user_without_role_is_denied_from_journals_endpoint()
    {
        $user = $this->createRegularUser();

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/journals');

        $response->assertStatus(403);
    }

    /** @test */
    public function regular_user_without_role_is_denied_from_employees_endpoint()
    {
        $user = $this->createRegularUser();

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/employees');

        $response->assertStatus(403);
    }

    // ========================================
    // DESTRUCTIVE OPERATION DENIAL
    // ========================================

    /** @test */
    public function regular_user_is_denied_from_user_deletion()
    {
        $user = $this->createRegularUser();

        $response = $this->actingAs($user, 'sanctum')
            ->deleteJson('/api/users/1');

        $response->assertStatus(403);
    }

    /** @test */
    public function regular_user_is_denied_from_product_deletion()
    {
        $user = $this->createRegularUser();

        $response = $this->actingAs($user, 'sanctum')
            ->deleteJson('/api/products/1');

        $response->assertStatus(403);
    }

    /** @test */
    public function regular_user_is_denied_from_journal_creation()
    {
        $user = $this->createRegularUser();

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/journals', ['description' => 'Test']);

        $response->assertStatus(403);
    }

    /** @test */
    public function regular_user_is_denied_from_posting_operation()
    {
        $user = $this->createRegularUser();

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/reports/post-journal', ['entry_code' => 'QID-10001']);

        $response->assertStatus(403);
    }

    /** @test */
    public function regular_user_is_denied_from_unposting_operation()
    {
        $user = $this->createRegularUser();

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/reports/unpost-journal', ['entry_code' => 'QID-10001']);

        $response->assertStatus(403);
    }

    // ========================================
    // POSTING/UNPOSTING WITH SYSTEM ROLES
    // ========================================

    /** @test */
    public function system_admin_can_post_journal()
    {
        $admin = $this->createUserWithRole('admin');

        // This will fail validation (no entry_code exists), but should not return 403
        $response = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/reports/post-journal', ['entry_code' => 'NONEXISTENT']);

        $this->assertNotEquals(403, $response->getStatus());
    }

    /** @test */
    public function system_admin_can_unpost_journal()
    {
        $admin = $this->createUserWithRole('admin');

        $response = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/reports/unpost-journal', ['entry_code' => 'NONEXISTENT']);

        $this->assertNotEquals(403, $response->getStatus());
    }

    // ========================================
    // CACHE ENDPOINTS
    // ========================================

    /** @test */
    public function unauthenticated_cache_clear_is_denied()
    {
        $response = $this->postJson('/api/cache/clear-all');
        $response->assertStatus(401);
    }

    /** @test */
    public function regular_user_cache_clear_is_denied()
    {
        $user = $this->createRegularUser();

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/cache/clear-all');

        $response->assertStatus(403);
    }

    /** @test */
    public function admin_cache_clear_is_allowed()
    {
        $admin = $this->createUserWithRole('admin');

        $response = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/cache/clear-app');

        $response->assertStatus(200);
    }
}
