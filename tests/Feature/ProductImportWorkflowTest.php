<?php

namespace Tests\Feature;

use App\Models\Products;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Tests\TestCase;

class ProductImportWorkflowTest extends TestCase
{
    protected function resolveUser(): ?User
    {
        $user = User::query()
            ->where('role', 'admin')
            ->whereNotNull('company_id')
            ->first();

        if (! $user) {
            $user = User::query()->whereNotNull('company_id')->first();
        }

        if (! $user) {
            $user = User::query()->where('role', 'admin')->first();
        }

        if (! $user) {
            $user = User::query()->first();
        }

        if (! $user) {
            return null;
        }

        if (! $user->company_id) {
            $companyTable = Schema::hasTable('companies_shares') ? 'companies_shares' : 'companies';
            $companyId = DB::table($companyTable)->value('id');
            if (! $companyId) {
                return null;
            }
            $user->company_id = (int) $companyId;
            $user->save();
        }

        return $user->fresh();
    }

    public function test_import_preview_confirm_full_workflow(): void
    {
        if (DB::connection()->getDriverName() === 'sqlite') {
            $this->markTestSkipped('This test requires a MySQL database.');
        }

        $user = $this->resolveUser();
        if (! $user) {
            $this->markTestSkipped('No suitable user/company found for import workflow test.');
        }

        $this->actingAs($user);

        $validCode = 'TST-'.strtoupper(Str::random(8));
        $validSku = 'SKU-'.strtoupper(Str::random(8));
        $invalidCode = 'TST-'.strtoupper(Str::random(8));
        $validName = "Test Imported Product {$validCode}";

        $validCsv = implode("\n", [
            'name,product_code,sku,price,quantity,status',
            "{$validName},{$validCode},{$validSku},99.5,10,active",
        ]);

        $previewResponse = $this->post(route('admin.products.import.preview'), [
            'file' => UploadedFile::fake()->createWithContent('products-valid.csv', $validCsv),
        ]);

        $this->assertSame(200, $previewResponse->getStatusCode(), $previewResponse->getContent());

        $previewResponse
            ->assertJsonStructure([
                'rows',
                'errors',
                'total',
                'shown',
                'token',
            ]);

        $previewResponse->assertJsonPath('total', 1);
        $previewResponse->assertJsonCount(0, 'errors');
        $token = $previewResponse->json('token');
        $this->assertNotEmpty($token);

        $confirmResponse = $this->post(route('admin.products.import.confirm'), [
            'token' => $token,
        ]);

        $this->assertSame(200, $confirmResponse->getStatusCode(), $confirmResponse->getContent());

        $confirmResponse
            ->assertJsonPath('message', 'Products imported successfully');

        $this->assertDatabaseHas('products', [
            'product_code' => $validCode,
            'name' => $validName,
        ]);

        $invalidCsv = implode("\n", [
            'name,product_code,sku,price,quantity,status',
            ",{$invalidCode},SKU-".strtoupper(Str::random(8)).',15,2,active',
        ]);

        $invalidPreviewResponse = $this->post(route('admin.products.import.preview'), [
            'file' => UploadedFile::fake()->createWithContent('products-invalid.csv', $invalidCsv),
        ]);

        $invalidPreviewResponse->assertStatus(200);
        $invalidPreviewResponse->assertJsonPath('total', 1);
        $this->assertGreaterThan(0, count($invalidPreviewResponse->json('errors', [])));

        $invalidConfirmResponse = $this->post(route('admin.products.import.confirm'), [
            'token' => $invalidPreviewResponse->json('token'),
        ]);
        $invalidConfirmResponse->assertStatus(422);
        $this->assertGreaterThan(0, count($invalidConfirmResponse->json('errors', [])));

        $wrongColumnsCsv = implode("\n", [
            'title,price,qty',
            'No Name Column,10,1',
        ]);

        $wrongColumnsResponse = $this->post(route('admin.products.import.preview'), [
            'file' => UploadedFile::fake()->createWithContent('products-wrong-columns.csv', $wrongColumnsCsv),
        ]);
        $wrongColumnsResponse->assertStatus(422);
        $this->assertGreaterThan(0, count($wrongColumnsResponse->json('errors', [])));

        $emptyCsv = 'name,product_code,sku,price,quantity,status';
        $emptyResponse = $this->post(route('admin.products.import.preview'), [
            'file' => UploadedFile::fake()->createWithContent('products-empty.csv', $emptyCsv),
        ]);
        $emptyResponse->assertStatus(200);
        $emptyResponse->assertJsonPath('total', 0);
        $emptyResponse->assertJsonCount(0, 'rows');

        Products::withTrashed()
            ->where('product_code', $validCode)
            ->forceDelete();
    }
}
