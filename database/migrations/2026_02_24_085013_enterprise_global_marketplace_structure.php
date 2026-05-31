<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Country Configurations
        if (! Schema::hasTable('country_configs')) {
            Schema::create('country_configs', function (Blueprint $table) {
                $table->id();
                $table->foreignId('location_id')->constrained('locations')->onDelete('cascade');
                $table->string('default_language')->default('en');
                $table->string('default_currency')->default('USD');
                $table->decimal('tax_percentage', 5, 2)->default(0);
                $table->json('shipping_rules')->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        // 3. Update existing tables for JSON translations
        Schema::table('products', function (Blueprint $table) {
            if (! Schema::hasColumn('products', 'name_json')) {
                $table->json('name_json')->after('name')->nullable();
            }
            if (! Schema::hasColumn('products', 'slug_json')) {
                $table->json('slug_json')->after('slug')->nullable();
            }
            if (! Schema::hasColumn('products', 'description_json')) {
                $table->json('description_json')->after('description')->nullable();
            }
            if (! Schema::hasColumn('products', 'meta_title_json')) {
                $table->json('meta_title_json')->after('meta_title')->nullable();
            }
            if (! Schema::hasColumn('products', 'meta_description_json')) {
                $table->json('meta_description_json')->after('meta_description')->nullable();
            }
        });

        Schema::table('categories', function (Blueprint $table) {
            if (! Schema::hasColumn('categories', 'name_json')) {
                $table->json('name_json')->after('name')->nullable();
            }
            if (! Schema::hasColumn('categories', 'slug_json')) {
                $table->json('slug_json')->after('slug')->nullable();
            }
        });

        Schema::table('suppliers', function (Blueprint $table) {
            if (! Schema::hasColumn('suppliers', 'store_name_json')) {
                if (Schema::hasColumn('suppliers', 'name_ar')) {
                    $table->json('store_name_json')->after('name_ar')->nullable();
                } else {
                    $table->json('store_name_json')->nullable();
                }
            }
            if (! Schema::hasColumn('suppliers', 'store_description_json')) {
                $table->json('store_description_json')->nullable();
            }
            if (! Schema::hasColumn('suppliers', 'commission_rate')) {
                $table->decimal('commission_rate', 5, 2)->default(0);
            }
            if (! Schema::hasColumn('suppliers', 'verification_status')) {
                $table->string('verification_status')->default('unverified'); // unverified, pending, verified
            }
        });
    }

    public function down(): void
    {
        if (Schema::hasTable('suppliers')) {
            Schema::table('suppliers', function (Blueprint $table) {
                $columns = [];
                foreach (['store_name_json', 'store_description_json', 'commission_rate', 'verification_status'] as $column) {
                    if (Schema::hasColumn('suppliers', $column)) {
                        $columns[] = $column;
                    }
                }
                if (! empty($columns)) {
                    $table->dropColumn($columns);
                }
            });
        }

        if (Schema::hasTable('categories')) {
            Schema::table('categories', function (Blueprint $table) {
                $columns = [];
                foreach (['name_json', 'slug_json'] as $column) {
                    if (Schema::hasColumn('categories', $column)) {
                        $columns[] = $column;
                    }
                }
                if (! empty($columns)) {
                    $table->dropColumn($columns);
                }
            });
        }

        if (Schema::hasTable('products')) {
            Schema::table('products', function (Blueprint $table) {
                $columns = [];
                foreach (['name_json', 'slug_json', 'description_json', 'meta_title_json', 'meta_description_json'] as $column) {
                    if (Schema::hasColumn('products', $column)) {
                        $columns[] = $column;
                    }
                }
                if (! empty($columns)) {
                    $table->dropColumn($columns);
                }
            });
        }
        Schema::dropIfExists('country_configs');
    }
};
