<?php

use App\Models\MediaFile;
use Illuminate\Support\Facades\Storage;

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$files = MediaFile::where('name', 'like', 'image_%.jpg')->limit(5)->get();

echo "Checking Specific Import Files:\n";
if ($files->isEmpty()) {
    echo "No files found with name like image_%.jpg\n";
}

foreach ($files as $file) {
    echo "ID: " . $file->id . "\n";
    echo "Name: " . $file->name . "\n";
    echo "Path: " . $file->file_path . "\n";
    
    $relativePath = str_replace('/storage/', '', $file->file_path);
    // If path starts with /, remove it for check
    $relativePath = ltrim($relativePath, '/');
    
    $exists = Storage::disk('public')->exists($relativePath);
    
    echo "Relative Path for check: " . $relativePath . "\n";
    echo "Exists in Storage: " . ($exists ? "YES" : "NO") . "\n";
    echo "Full Disk Path: " . Storage::disk('public')->path($relativePath) . "\n";
    echo "--------------------------------\n";
}
