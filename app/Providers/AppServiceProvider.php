<?php

namespace App\Providers;

use App\Models\Scopes\CompanyScope;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Auth;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);
        $this->loadMigrationsFrom([
            database_path('migrations/Assets'),
            database_path('migrations/Budget'),
            database_path('migrations/Client_Sales'),
            database_path('migrations/InvestingStack'),
            database_path('migrations/Taxes'),
            database_path('migrations/Tasks'),
            database_path('migrations/Vendor_Purchases'),
        ]);

        $scopedModels = [];
        Event::listen('eloquent.booted: *', function (string $eventName) use (&$scopedModels): void {
            $prefix = 'eloquent.booted: ';
            if (!str_starts_with($eventName, $prefix)) {
                return;
            }

            $class = substr($eventName, strlen($prefix));
            if ($class === '' || $class === Model::class) {
                return;
            }

            if (isset($scopedModels[$class])) {
                return;
            }

            if (!is_subclass_of($class, Model::class)) {
                return;
            }

            $scopedModels[$class] = true;
            $class::addGlobalScope(new CompanyScope());
        });

        $tableSupportsCompanyId = [];

        $supportsCompanyId = function (string $table) use (&$tableSupportsCompanyId): bool {
            if (array_key_exists($table, $tableSupportsCompanyId)) {
                return $tableSupportsCompanyId[$table];
            }

            $tableSupportsCompanyId[$table] = Schema::hasColumn($table, 'company_id');

            return $tableSupportsCompanyId[$table];
        };

        Event::listen('eloquent.creating: *', function (string $eventName, array $data) use ($supportsCompanyId): void {
            $model = $data[0] ?? null;
            if (!$model instanceof Model) {
                return;
            }

            $companyId = Auth::user()?->company_id;
            if (!$companyId) {
                return;
            }

            $table = $model->getTable();
            if ($table === 'company') {
                return;
            }

            if (!$supportsCompanyId($table)) {
                return;
            }

            if ($model->getAttribute('company_id')) {
                return;
            }

            $model->setAttribute('company_id', $companyId);
        });

        Event::listen('eloquent.saving: *', function (string $eventName, array $data) use ($supportsCompanyId): void {
            $model = $data[0] ?? null;
            if (!$model instanceof Model) {
                return;
            }

            $companyId = Auth::user()?->company_id;
            if (!$companyId) {
                return;
            }

            if (!$model->exists) {
                return;
            }

            if (!$model->isDirty('company_id')) {
                return;
            }

            $table = $model->getTable();
            if ($table === 'company') {
                return;
            }

            if (!$supportsCompanyId($table)) {
                return;
            }

            $model->setAttribute('company_id', $model->getOriginal('company_id'));
        });
    }
}
