<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CacheLog extends Model
{
    use HasFactory;

    protected $fillable = ['action', 'status', 'message'];

    public $timestamps = false; // Using created_at from migration
}
