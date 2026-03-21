<?php

use App\Models\Products;

$product = Products::whereNotNull('image')->first();
if ($product) {
    echo 'IMAGE_PATH:'.$product->image."\n";
} else {
    echo "NO_PRODUCT_WITH_IMAGE\n";
}
