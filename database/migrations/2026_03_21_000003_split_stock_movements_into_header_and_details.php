<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private function findFkConstraintName(string $table, string $column): ?string
    {
        $dbName = DB::getDatabaseName();

        $row = DB::table('information_schema.KEY_COLUMN_USAGE')
            ->select(['CONSTRAINT_NAME'])
            ->where('TABLE_SCHEMA', $dbName)
            ->where('TABLE_NAME', $table)
            ->where('COLUMN_NAME', $column)
            ->whereNotNull('REFERENCED_TABLE_NAME')
            ->first();

        $name = (string) ($row->CONSTRAINT_NAME ?? '');

        return $name !== '' ? $name : null;
    }

    public function up(): void
    {
        $alreadySplit =
            Schema::hasTable('stock_movements') &&
            Schema::hasTable('stock_movements_details') &&
            Schema::hasColumn('stock_movements_details', 'stock_movement_id');

        if ($alreadySplit) {
            return;
        }

        if (Schema::hasTable('stock_movements') && ! Schema::hasTable('stock_movements_details')) {
            Schema::rename('stock_movements', 'stock_movements_details');
        }

        if (! Schema::hasTable('stock_movements')) {
            Schema::create('stock_movements', function (Blueprint $table) {
                $table->bigIncrements('id');

                $table->date('movement_date')->nullable();

                $table->enum('type', [
                    'opening',
                    'purchase',
                    'sale',
                    'sale_return',
                    'purchase_return',
                    'adjustment',
                    'transfer',
                ]);

                $table->enum('direction', ['in', 'out']);

                $table->unsignedBigInteger('reference_id')->nullable();
                $table->string('reference_type', 50)->nullable();
                $table->string('voucher_num', 50)->nullable();

                $table->unsignedBigInteger('warehouse_id')->nullable();
                $table->unsignedBigInteger('to_warehouse_id')->nullable();

                $table->unsignedBigInteger('company_id');
                $table->text('notes')->nullable();
                $table->timestamps();

                $table->index('company_id', 'idx_company');
                $table->index('type', 'idx_type');
                $table->index('movement_date', 'idx_movement_date');

                $table->foreign('warehouse_id', 'stock_movements_hdr_warehouse_id_fk')->references('id')->on('warehouses')->nullOnDelete();
                $table->foreign('to_warehouse_id', 'stock_movements_hdr_to_warehouse_id_fk')->references('id')->on('warehouses')->nullOnDelete();

                if (Schema::hasTable('company')) {
                    $table->foreign('company_id', 'stock_movements_hdr_company_id_fk')->references('id')->on('company')->cascadeOnDelete();
                } elseif (Schema::hasTable('companies_shares')) {
                    $table->foreign('company_id', 'stock_movements_hdr_company_id_fk')->references('id')->on('companies_shares')->cascadeOnDelete();
                } elseif (Schema::hasTable('companies')) {
                    $table->foreign('company_id', 'stock_movements_hdr_company_id_fk')->references('id')->on('companies')->cascadeOnDelete();
                }
            });
        }

        if (! Schema::hasTable('stock_movements_details')) {
            return;
        }

        if (! Schema::hasColumn('stock_movements_details', 'stock_movement_id')) {
            Schema::table('stock_movements_details', function (Blueprint $table) {
                $table->unsignedBigInteger('stock_movement_id')->nullable()->after('id');
            });
        }

        $hasLegacyHeaderColumns = Schema::hasColumn('stock_movements_details', 'type') &&
            Schema::hasColumn('stock_movements_details', 'direction') &&
            Schema::hasColumn('stock_movements_details', 'company_id');

        if ($hasLegacyHeaderColumns) {
            DB::table('stock_movements_details')
                ->whereNull('stock_movement_id')
                ->orderBy('id')
                ->chunkById(200, function ($rows) {
                    foreach ($rows as $row) {
                        $createdAt = $row->created_at ? Carbon::parse($row->created_at) : now();
                        $updatedAt = $row->updated_at ? Carbon::parse($row->updated_at) : $createdAt;

                        $headerId = DB::table('stock_movements')->insertGetId([
                            'movement_date' => $createdAt->toDateString(),
                            'type' => $row->type,
                            'direction' => $row->direction,
                            'reference_id' => $row->reference_id,
                            'reference_type' => $row->reference_type,
                            'voucher_num' => $row->voucher_num ?? null,
                            'warehouse_id' => $row->warehouse_id,
                            'to_warehouse_id' => $row->to_warehouse_id,
                            'company_id' => $row->company_id,
                            'notes' => $row->notes,
                            'created_at' => $createdAt,
                            'updated_at' => $updatedAt,
                        ]);

                        DB::table('stock_movements_details')
                            ->where('id', $row->id)
                            ->update(['stock_movement_id' => $headerId]);
                    }
                });

            foreach (['company_id', 'warehouse_id', 'to_warehouse_id'] as $col) {
                if (! Schema::hasColumn('stock_movements_details', $col)) {
                    continue;
                }

                $constraint = $this->findFkConstraintName('stock_movements_details', $col);
                if ($constraint) {
                    try {
                        Schema::table('stock_movements_details', function (Blueprint $table) use ($constraint) {
                            $table->dropForeign($constraint);
                        });
                    } catch (\Throwable $e) {
                    }
                }
            }

            Schema::table('stock_movements_details', function (Blueprint $table) {
                $drop = [];
                foreach (['type', 'direction', 'reference_id', 'reference_type', 'voucher_num', 'warehouse_id', 'to_warehouse_id', 'company_id', 'notes'] as $col) {
                    if (Schema::hasColumn('stock_movements_details', $col)) {
                        $drop[] = $col;
                    }
                }
                if (count($drop) > 0) {
                    $table->dropColumn($drop);
                }
            });
        }

        $detailFk = $this->findFkConstraintName('stock_movements_details', 'stock_movement_id');
        if (! $detailFk) {
            try {
                Schema::table('stock_movements_details', function (Blueprint $table) {
                    $table
                        ->foreign('stock_movement_id', 'stock_movements_details_stock_movement_id_fk')
                        ->references('id')
                        ->on('stock_movements')
                        ->cascadeOnDelete();
                });
            } catch (\Throwable $e) {
            }
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('stock_movements') || ! Schema::hasTable('stock_movements_details')) {
            return;
        }

        $missingLegacy = ! Schema::hasColumn('stock_movements_details', 'type');

        if ($missingLegacy) {
            Schema::table('stock_movements_details', function (Blueprint $table) {
                if (! Schema::hasColumn('stock_movements_details', 'type')) {
                    $table->enum('type', [
                        'opening',
                        'purchase',
                        'sale',
                        'sale_return',
                        'purchase_return',
                        'adjustment',
                        'transfer',
                    ])->nullable()->after('unit_id');
                }

                if (! Schema::hasColumn('stock_movements_details', 'direction')) {
                    $table->enum('direction', ['in', 'out'])->nullable()->after('type');
                }

                if (! Schema::hasColumn('stock_movements_details', 'reference_id')) {
                    $table->unsignedBigInteger('reference_id')->nullable()->after('direction');
                }

                if (! Schema::hasColumn('stock_movements_details', 'reference_type')) {
                    $table->string('reference_type', 50)->nullable()->after('reference_id');
                }

                if (! Schema::hasColumn('stock_movements_details', 'voucher_num')) {
                    $table->string('voucher_num', 50)->nullable()->after('reference_type');
                }

                if (! Schema::hasColumn('stock_movements_details', 'warehouse_id')) {
                    $table->unsignedBigInteger('warehouse_id')->nullable()->after('reference_type');
                }

                if (! Schema::hasColumn('stock_movements_details', 'to_warehouse_id')) {
                    $table->unsignedBigInteger('to_warehouse_id')->nullable()->after('warehouse_id');
                }

                if (! Schema::hasColumn('stock_movements_details', 'company_id')) {
                    $table->unsignedBigInteger('company_id')->nullable()->after('to_warehouse_id');
                }

                if (! Schema::hasColumn('stock_movements_details', 'notes')) {
                    $table->text('notes')->nullable()->after('company_id');
                }
            });

            DB::table('stock_movements_details')
                ->whereNotNull('stock_movement_id')
                ->orderBy('id')
                ->chunkById(200, function ($rows) {
                    foreach ($rows as $row) {
                        $header = DB::table('stock_movements')->where('id', $row->stock_movement_id)->first();
                        if (! $header) {
                            continue;
                        }

                        DB::table('stock_movements_details')
                            ->where('id', $row->id)
                            ->update([
                                'type' => $header->type,
                                'direction' => $header->direction,
                                'reference_id' => $header->reference_id,
                                'reference_type' => $header->reference_type,
                                'voucher_num' => $header->voucher_num,
                                'warehouse_id' => $header->warehouse_id,
                                'to_warehouse_id' => $header->to_warehouse_id,
                                'company_id' => $header->company_id,
                                'notes' => $header->notes,
                            ]);
                    }
                });
        }

        $constraint = $this->findFkConstraintName('stock_movements_details', 'stock_movement_id');
        if ($constraint) {
            try {
                Schema::table('stock_movements_details', function (Blueprint $table) use ($constraint) {
                    $table->dropForeign($constraint);
                });
            } catch (\Throwable $e) {
            }
        }

        if (Schema::hasColumn('stock_movements_details', 'stock_movement_id')) {
            Schema::table('stock_movements_details', function (Blueprint $table) {
                $table->dropColumn('stock_movement_id');
            });
        }

        Schema::dropIfExists('stock_movements');
        Schema::rename('stock_movements_details', 'stock_movements');
    }
};
