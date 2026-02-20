# Build Script for ZodicERP Production Zip

# Ensure we are in the script directory
$baseDir = $PSScriptRoot
Set-Location $baseDir
Write-Host "Starting Build Process in $baseDir" -ForegroundColor Green

# 1. Build Frontend
Write-Host "Building Frontend Assets..." -ForegroundColor Yellow
# Use cmd /c to prevent any shell context issues
cmd /c npm run build

# 2. Create Temp Directory
$tempDir = Join-Path $baseDir "zodicerp_build_temp"
Write-Host "Creating temp dir: $tempDir"
if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
New-Item -ItemType Directory -Path $tempDir | Out-Null

# 3. Copy Files (Excluding dev/unnecessary files)
Write-Host "Copying files..." -ForegroundColor Yellow
$exclude = @(
    ".git",
    ".github",
    "node_modules",
    "storage",
    "tests",
    "bootstrap/cache",
    ".env",
    "hot",
    "zodicerp_build_temp",
    "zodicerp_production.zip",
    "build_zip.ps1"
)
$items = Get-ChildItem -Path $baseDir

foreach ($item in $items) {
    if ($exclude -notcontains $item.Name) {
        $dest = Join-Path $tempDir $item.Name
        Copy-Item -Path $item.FullName -Destination $dest -Recurse -Force
    }
}

# 4. Install Production Dependencies
Write-Host "Installing Production Composer Dependencies..." -ForegroundColor Yellow
Set-Location $tempDir
# Ensure we use the composer from the system path
cmd /c composer install --no-dev --optimize-autoloader --ignore-platform-reqs --no-progress

# 5. Zip
Set-Location $baseDir
$zipFile = Join-Path $baseDir "zodicerp_production.zip"
Write-Host "Zipping to $zipFile..." -ForegroundColor Yellow
if (Test-Path $zipFile) { Remove-Item $zipFile -Force }
Compress-Archive -Path "$tempDir\*" -DestinationPath $zipFile

# 6. Cleanup
Write-Host "Cleaning up..." -ForegroundColor Yellow
Remove-Item $tempDir -Recurse -Force

Write-Host "Build Complete! File created: $zipFile" -ForegroundColor Green
