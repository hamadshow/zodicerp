<?php

namespace App\Models\Tasks;

use Illuminate\Database\Eloquent\Model;

class TaskAttachment extends Model
{
    protected $fillable = ['task_id', 'file_path', 'file_name'];

    public function task()
    {
        return $this->belongsTo(Task::class);
    }
}