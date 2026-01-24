<?php

namespace App\Models\Tasks;

use Illuminate\Database\Eloquent\Model;

class TaskCategory extends Model
{
    protected $fillable = ['name', 'description'];

    public function tasks()
    {
        return $this->hasMany(Task::class, 'category_id');
    }
}