<?php

use App\Models\Products;
use Illuminate\Support\Facades\Schema;

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "Table 'products' exists: ".(Schema::hasTable('products') ? 'YES' : 'NO')."\n";
if (Schema::hasTable('products')) {
    echo 'Columns: '.implode(', ', Schema::getColumnListing('products'))."\n";
    echo 'Product Count: '.Products::count()."\n";
    $product = Products::first();
    if ($product) {
        echo 'First Product: '.json_encode($product->toArray())."\n";
    }
}
