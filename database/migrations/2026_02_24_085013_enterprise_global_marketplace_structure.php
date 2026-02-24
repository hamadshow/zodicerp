<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Country Configurations
        if (!Schema::hasTable('country_configs')) {
            Schema::create('country_configs', function (Blueprint $table) {
                $table->id();
                $table->foreignId('country_id')->constrained('countries')->onDelete('cascade');
                $table->string('default_language')->default('en');
                $table->string('default_currency')->default('USD');
                $table->decimal('tax_percentage', 5, 2)->default(0);
                $table->json('shipping_rules')->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        // 2. Vendor Wallet System
        if (!Schema::hasTable('vendor_wallets')) {
            Schema::create('vendor_wallets', function (Blueprint $table) {
                $table->id();
                $table->foreignId('vendor_id')->constrained('suppliers')->onDelete('cascade');
                $table->decimal('balance', 15, 2)->default(0);
                $table->decimal('pending_balance', 15, 2)->default(0);
                $table->decimal('withdrawn_total', 15, 2)->default(0);
                $table->string('currency')->default('USD');
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('vendor_wallet_transactions')) {
            Schema::create('vendor_wallet_transactions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('wallet_id')->constrained('vendor_wallets')->onDelete('cascade');
                $table->decimal('amount', 15, 2);
                $table->string('type'); // credit, debit
                $table->string('status'); // pending, completed, cancelled
                $table->string('description')->nullable();
                $table->json('metadata')->nullable();
                $table->timestamps();
            });
        }

        // 3. Update existing tables for JSON translations
        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasColumn('products', 'name_json')) {
                $table->json('name_json')->after('name')->nullable();
            }
            if (!Schema::hasColumn('products', 'slug_json')) {
                $table->json('slug_json')->after('slug')->nullable();
            }
            if (!Schema::hasColumn('products', 'description_json')) {
                $table->json('description_json')->after('description')->nullable();
            }
            if (!Schema::hasColumn('products', 'meta_title_json')) {
                $table->json('meta_title_json')->after('meta_title')->nullable();
            }
            if (!Schema::hasColumn('products', 'meta_description_json')) {
                $table->json('meta_description_json')->after('meta_description')->nullable();
            }
        });

        Schema::table('categories', function (Blueprint $table) {
            if (!Schema::hasColumn('categories', 'name_json')) {
                $table->json('name_json')->after('name')->nullable();
            }
            if (!Schema::hasColumn('categories', 'slug_json')) {
                $table->json('slug_json')->after('slug')->nullable();
            }
        });

        Schema::table('suppliers', function (Blueprint $table) {
            if (!Schema::hasColumn('suppliers', 'store_name_json')) {
                $table->json('store_name_json')->after('name_ar')->nullable();
            }
            if (!Schema::hasColumn('suppliers', 'store_description_json')) {
                $table->json('store_description_json')->nullable();
            }
            if (!Schema::hasColumn('suppliers', 'commission_rate')) {
                $table->decimal('commission_rate', 5, 2)->default(0);
            }
            if (!Schema::hasColumn('suppliers', 'verification_status')) {
                $table->string('verification_status')->default('unverified'); // unverified, pending, verified
            }
        });
    }

    public function down(): void
    {
        Schema::table('suppliers', function (Blueprint $table) {
            $table->dropColumn(['store_name_json', 'store_description_json', 'commission_rate', 'verification_status']);
        });

        Schema::table('categories', function (Blueprint $table) {
            $table->dropColumn(['name_json', 'slug_json']);
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['name_json', 'slug_json', 'description_json', 'meta_title_json', 'meta_description_json']);
        });

        Schema::dropIfExists('vendor_wallet_transactions');
        Schema::dropIfExists('vendor_wallets');
        Schema::dropIfExists('country_configs');
    }
};
