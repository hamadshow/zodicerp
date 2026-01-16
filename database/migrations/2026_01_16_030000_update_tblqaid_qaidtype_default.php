<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('tblqaid')) {
            DB::statement("ALTER TABLE `tblqaid` MODIFY `QaidType` VARCHAR(50) NULL DEFAULT 'Qmanual'");
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('tblqaid')) {
            DB::statement("ALTER TABLE `tblqaid` MODIFY `QaidType` VARCHAR(50) NULL DEFAULT NULL");
        }
    }
};
