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
        // تم إلغاء التصفية حسب الشركة للسماح لجميع المستخدمين بالوصول لجميع البيانات
        return;
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
