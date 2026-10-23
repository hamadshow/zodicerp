<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const ACCEPTED_VALUES = ['simple', 'variation', 'service', 'variable', 'Service'];

    public function up(): void
    {
        if (! Schema::hasTable('products') || ! Schema::hasColumn('products', 'product_type')) {
            return;
        }

        $column = DB::selectOne("SHOW COLUMNS FROM products WHERE Field = 'product_type'");
        if ($column?->Type === "enum('simple','variation','service')" && $column?->Default === 'simple') {
            return;
        }

        $this->assertKnownValues();

        // Temporarily widen the column so legacy values survive conversion.
        DB::statement(
            "ALTER TABLE products MODIFY product_type VARCHAR(16) NOT NULL DEFAULT 'simple'"
        );

        DB::table('products')
            ->whereRaw('BINARY product_type = ?', ['variable'])
            ->update(['product_type' => 'variation']);
        DB::table('products')
            ->whereRaw('BINARY product_type = ?', ['Service'])
            ->update(['product_type' => 'service']);

        DB::statement(
            "ALTER TABLE products MODIFY product_type ENUM('simple','variation','service') NOT NULL DEFAULT 'simple'"
        );
    }

    public function down(): void
    {
        if (! Schema::hasTable('products') || ! Schema::hasColumn('products', 'product_type')) {
            return;
        }

        $this->assertKnownValues();

        DB::statement(
            "ALTER TABLE products MODIFY product_type VARCHAR(16) NOT NULL DEFAULT 'simple'"
        );

        DB::table('products')
            ->whereRaw('BINARY product_type = ?', ['variation'])
            ->update(['product_type' => 'variable']);
        DB::table('products')
            ->whereRaw('BINARY product_type = ?', ['Service'])
            ->update(['product_type' => 'service']);

        DB::statement(
            "ALTER TABLE products MODIFY product_type ENUM('simple','variable','service') NOT NULL DEFAULT 'simple'"
        );
    }

    private function assertKnownValues(): void
    {
        $placeholders = implode(',', array_fill(0, count(self::ACCEPTED_VALUES), '?'));
        $invalidRows = DB::table('products')
            ->select(['id', 'product_type'])
            ->where(function ($query) use ($placeholders) {
                $query->whereNull('product_type')
                    ->orWhereRaw(
                        "BINARY product_type NOT IN ({$placeholders})",
                        self::ACCEPTED_VALUES
                    );
            })
            ->limit(20)
            ->get();

        if ($invalidRows->isNotEmpty()) {
            $invalid = $invalidRows
                ->map(fn ($row) => "id={$row->id}, product_type=".var_export($row->product_type, true))
                ->implode('; ');

            throw new \RuntimeException(
                'Cannot normalize products.product_type: reconcile blank or unsupported values before migrating. '
                .'Sample rows: '.$invalid
            );
        }
    }
};
