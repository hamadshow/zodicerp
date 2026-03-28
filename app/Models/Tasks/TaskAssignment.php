<?php

namespace App\Models\Tasks;

use App\Models\Employee;
use Illuminate\Database\Eloquent\Model;

class TaskAssignment extends Model
{
    protected $fillable = ['task_id', 'user_id', 'assigned_at'];

    public function task()
    {
        return $this->belongsTo(Task::class);
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class, 'user_id');
    }
}
