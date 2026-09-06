<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class BlockerVerificationTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        $this->createTestAccount('11401', 'Inventory Asset');
        $this->createTestAccount('501', 'Cost of Sales');
        $this->createTestAccount('401', 'Sales Revenue');
    }

    public function test_inventory_asset_account_is_resolved_by_business_code(): void
    {
        $expectedId = $this->accountId('11401');

        $this->assertSame($expectedId, $this->invokeResolver(
            new \App\Http\Controllers\Backend\Purchases\PurchaseInvoiceController(),
            'resolvePurchaseAccountId'
        ));
        $this->assertSame($expectedId, $this->invokeResolver(
            new \App\Services\Vendor_Purchases\PurchaseReturnService(),
            'resolvePurchaseAccountId'
        ));
        $this->assertSame($expectedId, $this->invokeResolver(
            new \App\Http\Controllers\Backend\Client_Sales\SalesInvoiceController(),
            'resolveInventoryAssetAccountId'
        ));
        $this->assertSame($expectedId, $this->invokeResolver(
            new \App\Services\Client_Sales\SalesReturnService(),
            'resolveInventoryAssetAccountId'
        ));
        $this->assertSame($expectedId, $this->invokeResolver(
            new \App\Services\Inventory\StockAdjustmentService(),
            'resolveInventoryAssetAccountId'
        ));
    }

    public function test_sales_invoice_uses_cogs_and_revenue_business_codes(): void
    {
        $controller = new \App\Http\Controllers\Backend\Client_Sales\SalesInvoiceController();

        $this->assertSame(
            $this->accountId('501'),
            $this->invokeResolver($controller, 'resolveCogsAccountId')
        );
        $this->assertSame(
            $this->accountId('401'),
            $this->invokeResolver($controller, 'resolveSalesRevenueAccountId')
        );
    }

    private function accountId(string $code): int
    {
        return (int) DB::table('accounts')->where('AccCode', $code)->value('AccID');
    }

    private function invokeResolver(object $service, string $methodName): int
    {
        $method = (new \ReflectionClass($service))->getMethod($methodName);
        $method->setAccessible(true);

        return (int) $method->invoke($service);
    }
}