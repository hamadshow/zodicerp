<?php

namespace App\Models\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Facades\Schema;

class CompanyScope implements Scope
{
    protected static array $tableSupportsCompanyId = [];

    public function apply(Builder $builder, Model $model): void
    {
        /** @var \Illuminate\Http\Request $request */
        $request = request();
        /** @var \Illuminate\Database\Eloquent\Model $model */
        if (! $request->hasSession()) {
            return;
        }

        $companyId = $request->session()->get('company_id');
        if (! $companyId) {
            return;
        }

        $table = $model->getTable();
        if ($table === 'company') {
            return;
        }

        if (in_array($table, ['migrations', 'failed_jobs', 'password_reset_tokens', 'personal_access_tokens'], true)) {
            return;
        }

        if (! $this->supportsCompanyId($table)) {
            return;
        }

        if (in_array($table, ['item_units', 'item_unit_conversions'], true)) {
            $builder->where(function (Builder $query) use ($table, $companyId): void {
                $query->where($table.'.company_id', $companyId)
                    ->orWhereNull($table.'.company_id');
            });

            return;
        }

        $builder->where($table.'.company_id', $companyId);
    }

    protected function supportsCompanyId(string $table): bool
    {
        if (array_key_exists($table, self::$tableSupportsCompanyId)) {
            return self::$tableSupportsCompanyId[$table];
        }

        self::$tableSupportsCompanyId[$table] = Schema::hasColumn($table, 'company_id');

        return self::$tableSupportsCompanyId[$table];
    }
}
