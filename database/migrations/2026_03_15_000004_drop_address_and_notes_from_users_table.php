<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $columns = ['address', 'notes'];

        $existing = array_values(array_filter($columns, function (string $column) {
            return Schema::hasColumn('users', $column);
        }));

        if ($existing === []) {
            return;
        }

        Schema::table('users', function (Blueprint $table) use ($existing) {
            $table->dropColumn($existing);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'address')) {
                $table->text('address')->nullable();
            }

            if (!Schema::hasColumn('users', 'notes')) {
                $table->text('notes')->nullable();
            }
        });
    }
};

