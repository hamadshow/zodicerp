<?php

namespace App\Http\Controllers\Backend\Settings;

use App\Http\Controllers\Controller;
use App\Models\CacheLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Inertia\Inertia;

class CacheController extends Controller
{
    public function index()
    {
        $logs = CacheLog::orderBy('created_at', 'desc')->limit(20)->get();
        return Inertia::render('Backend/Settings/CacheManagement', [
            'logs' => $logs
        ]);
    }

    public function clearAppCache()
    {
        return $this->runArtisan('cache:clear', 'Application Cache');
    }

    public function clearConfigCache()
    {
        return $this->runArtisan('config:clear', 'Configuration Cache');
    }

    public function clearRouteCache()
    {
        return $this->runArtisan('route:clear', 'Route Cache');
    }

    public function clearViewCache()
    {
        return $this->runArtisan('view:clear', 'View Cache');
    }

    public function clearAll()
    {
        try {
            Artisan::call('cache:clear');
            Artisan::call('config:clear');
            Artisan::call('route:clear');
            Artisan::call('view:clear');
            Artisan::call('optimize:clear');

            $this->logAction('Clear All Cache', 'success', 'All system caches cleared successfully.');

            return response()->json([
                'status' => 'success',
                'message' => 'All system caches cleared successfully.'
            ]);
        } catch (\Exception $e) {
            $this->logAction('Clear All Cache', 'error', $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Error clearing all caches: ' . $e->getMessage()
            ], 500);
        }
    }

    private function runArtisan($command, $actionName)
    {
        try {
            Artisan::call($command);
            $this->logAction($actionName, 'success', "{$actionName} cleared successfully.");
            return response()->json([
                'status' => 'success',
                'message' => "{$actionName} cleared successfully."
            ]);
        } catch (\Exception $e) {
            $this->logAction($actionName, 'error', $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => "Error clearing {$actionName}: " . $e->getMessage()
            ], 500);
        }
    }

    private function logAction($action, $status, $message)
    {
        CacheLog::create([
            'action' => $action,
            'status' => $status,
            'message' => $message
        ]);
    }
}
