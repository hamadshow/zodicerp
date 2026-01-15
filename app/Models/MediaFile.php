<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MediaFile extends Model
{
    use HasFactory;

    protected $fillable = [
        'folder_id',
        'name',
        'file_path',
        'file_type',
        'size',
    ];

    public function folder()
    {
        return $this->belongsTo(MediaFolder::class, 'folder_id');
    }
}
