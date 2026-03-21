<?php

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

echo '<h1>ZodicERP Installation Helper</h1>';
echo '<p>Diagnosing server environment...</p>';

// 1. Check PHP Version
echo '<h2>1. PHP Version</h2>';
echo 'Current Version: '.phpversion().'<br>';
if (version_compare(phpversion(), '8.2.0', '<')) {
    echo "<span style='color:red'>❌ ERROR: PHP 8.2 or higher is required. Please update PHP version in cPanel/Hosting.</span><br>";
} else {
    echo "<span style='color:green'>✅ OK: PHP version is compatible.</span><br>";
}

// 2. Check/Create .env
echo '<h2>2. Environment File (.env)</h2>';
$baseDir = dirname(__DIR__);
$envFile = $baseDir.'/.env';
$envExample = $baseDir.'/.env.example';

if (file_exists($envFile)) {
    echo "<span style='color:green'>✅ OK: .env exists.</span><br>";
} else {
    echo '⚠️ .env file missing. Attempting to create...<br>';
    if (file_exists($envExample)) {
        if (copy($envExample, $envFile)) {
            echo "<span style='color:green'>✅ SUCCESS: Created .env from .env.example</span><br>";
            echo '<strong>ℹ️ Note: You still need to edit .env to add DB credentials!</strong><br>';
        } else {
            echo "<span style='color:red'>❌ ERROR: Could not copy .env.example to .env. Permission denied.</span><br>";
        }
    } else {
        echo "<span style='color:red'>❌ ERROR: .env.example not found in root.</span><br>";
    }
}

// 3. Storage Permissions & Existence
echo '<h2>3. Storage & Cache Directories</h2>';
$folders = [
    '/storage',
    '/storage/app',
    '/storage/app/public',
    '/storage/framework',
    '/storage/framework/views',
    '/storage/framework/cache',
    '/storage/framework/sessions',
    '/storage/logs',
    '/bootstrap/cache',
];

$hasErrors = false;

foreach ($folders as $folder) {
    $path = $baseDir.$folder;

    // Create if missing
    if (! file_exists($path)) {
        echo "Directory $folder missing. Creating... ";
        if (mkdir($path, 0755, true)) {
            echo "<span style='color:green'>Created.</span><br>";
        } else {
            echo "<span style='color:red'>Failed to create.</span><br>";
            $hasErrors = true;

            continue;
        }
    }

    // Check Writable
    if (is_writable($path)) {
        echo "<span style='color:green'>✅ OK: $folder is writable.</span><br>";
    } else {
        echo "⚠️ $folder is NOT writable. Attempting chmod... ";
        if (@chmod($path, 0775)) {
            echo "<span style='color:green'>Fixed.</span><br>";
        } else {
            echo "<span style='color:red'>❌ Failed. Please chmod 775 manually.</span><br>";
            $hasErrors = true;
        }
    }
}

echo '<hr>';
if ($hasErrors) {
    echo '<h3>❌ Diagnosis Failed</h3>';
    echo 'Please fix the red errors above using your File Manager.';
} else {
    echo '<h3>✅ Diagnosis Passed</h3>';
    echo 'Your server directories and .env file are ready.<br>';
    echo 'If you still see a 500 Error, please:<br>';
    echo '1. Edit <code>.env</code> and set <code>APP_DEBUG=true</code><br>';
    echo '2. Check if your Database credentials are correct in <code>.env</code><br>';
}
