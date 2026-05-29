<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('bank_receipts');
        Schema::dropIfExists('bank_payments');
    }

    public function down(): void
    {
        // Intentionally not recreating legacy tables.
        // Fresh installs should rely on treasury_transactions.
    }
};

