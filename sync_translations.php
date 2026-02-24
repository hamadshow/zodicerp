<?php
use App\Models\LanguageLine;

$translations = [
    ['group' => 'home', 'key' => 'all_categories', 'text' => ['ar' => 'كل الفئات', 'en' => 'All Categories']],
    ['group' => 'home', 'key' => 'top_categories', 'text' => ['ar' => 'أفضل الفئات', 'en' => 'Top Categories']],
    ['group' => 'home', 'key' => 'new_arrivals', 'text' => ['ar' => 'وصل حديثاً', 'en' => 'New Arrivals']],
    ['group' => 'home', 'key' => 'view_all_categories', 'text' => ['ar' => 'عرض كل الفئات', 'en' => 'View All Categories']],
    ['group' => 'home', 'key' => 'shop_now', 'text' => ['ar' => 'تسوق الآن', 'en' => 'Shop Now']],
];

foreach ($translations as $t) {
    LanguageLine::updateOrCreate(
        ['group' => $t['group'], 'key' => $t['key']],
        ['text' => $t['text']]
    );
    echo "Updated/Created: {$t['group']}.{$t['key']}\n";
}
