<?php

use App\Models\MediaFile;
use Illuminate\Support\Facades\Storage;

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$files = MediaFile::limit(5)->get();

echo "Checking Media Files:\n";
foreach ($files as $file) {
    echo 'ID: '.$file->id."\n";
    echo 'Name: '.$file->name."\n";
    echo 'Path: '.$file->file_path."\n";

    // Check if file exists on disk
    // file_path usually starts with /storage/ or just the path relative to public?
    // MediaController stores: Storage::url($path) -> /storage/media/images/filename.jpg

    // To check existence, we need the path relative to storage/app/public
    // If file_path is /storage/media/images/foo.jpg, we need media/images/foo.jpg
    $relativePath = str_replace('/storage/', '', $file->file_path);
    $exists = Storage::disk('public')->exists($relativePath);

    echo 'Relative Path for check: '.$relativePath."\n";
    echo 'Exists in Storage: '.($exists ? 'YES' : 'NO')."\n";
    echo "--------------------------------\n";
}
