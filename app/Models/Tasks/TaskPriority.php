<?php

namespace App\Models\Tasks;

use Illuminate\Database\Eloquent\Model;

class TaskPriority extends Model
{
    protected $fillable = ['name', 'level', 'description'];

    public function tasks()
    {
        return $this->hasMany(Task::class, 'priority_id');
    }
}