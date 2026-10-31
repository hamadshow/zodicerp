<?php

namespace Tests\Unit;

use App\Models\Client_Sales\Customer;
use App\Models\Client_Sales\CustomerGroup;
use App\Models\Products;
use App\Services\ProductPriceResolver;
use PHPUnit\Framework\TestCase;

class ProductPriceResolverTest extends TestCase
{
    public function test_product_model_prices_are_not_used_as_a_fallback(): void
    {
        $product = new Products([
            'price' => '120.00',
            'sale_price' => '100.00',
            'unit_id' => 1,
        ]);

        $result = (new ProductPriceResolver())->resolve([
            'product' => $product,
            'quantity' => '1',
            'unit_id' => 1,
            'transaction_date' => '2026-09-15',
        ]);

        $this->assertSame('none', $result['source']);
        $this->assertNull($result['final_price']);
    }

    public function test_customer_group_discount_does_not_invent_a_base_price(): void
    {
        $group = new CustomerGroup(['discount_percentage' => '10.00']);
        $customer = new Customer(['customer_group_id' => 1]);
        $customer->setRelation('group', $group);
        $product = new Products([
            'price' => '120.00',
            'sale_price' => null,
            'unit_id' => 1,
        ]);

        $result = (new ProductPriceResolver())->resolve([
            'product' => $product,
            'customer' => $customer,
            'quantity' => '1',
            'unit_id' => 1,
            'transaction_date' => '2026-09-15',
        ]);

        $this->assertSame('none', $result['source']);
        $this->assertNull($result['final_price']);
    }

    public function test_missing_product_prices_return_no_price(): void
    {
        $product = new Products(['unit_id' => 1]);

        $result = (new ProductPriceResolver())->resolve([
            'product' => $product,
            'quantity' => '1',
            'unit_id' => 1,
            'transaction_date' => '2026-09-15',
        ]);

        $this->assertSame('none', $result['source']);
        $this->assertNull($result['final_price']);
    }
}
