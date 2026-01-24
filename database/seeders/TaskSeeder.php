<?php

namespace Database\Seeders;

use App\Models\Tasks\TaskCategory;
use App\Models\Tasks\TaskPriority;
use App\Models\Tasks\TaskStatus;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class TaskSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Seed task categories
        $categories = [
            ['name' => 'Development', 'description' => 'Software development tasks'],
            ['name' => 'Design', 'description' => 'UI/UX design tasks'],
            ['name' => 'Testing', 'description' => 'Quality assurance and testing tasks'],
            ['name' => 'Documentation', 'description' => 'Documentation and knowledge base tasks'],
            ['name' => 'Maintenance', 'description' => 'System maintenance and support tasks'],
        ];

        foreach ($categories as $category) {
            TaskCategory::create($category);
        }

        // Seed task priorities
        $priorities = [
            ['name' => 'Low', 'level' => 1, 'description' => 'Low priority tasks'],
            ['name' => 'Medium', 'level' => 2, 'description' => 'Medium priority tasks'],
            ['name' => 'High', 'level' => 3, 'description' => 'High priority tasks'],
            ['name' => 'Urgent', 'level' => 4, 'description' => 'Urgent priority tasks'],
        ];

        foreach ($priorities as $priority) {
            TaskPriority::create($priority);
        }

        // Seed task statuses
        $statuses = [
            ['name' => 'Pending', 'description' => 'Task is pending'],
            ['name' => 'In Progress', 'description' => 'Task is currently in progress'],
            ['name' => 'Review', 'description' => 'Task is under review'],
            ['name' => 'Completed', 'description' => 'Task is completed'],
            ['name' => 'Cancelled', 'description' => 'Task is cancelled'],
        ];

        foreach ($statuses as $status) {
            TaskStatus::create($status);
        }
    }
}