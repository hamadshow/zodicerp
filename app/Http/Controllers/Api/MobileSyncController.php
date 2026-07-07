<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;

class MobileSyncController extends Controller
{
    public function sync(Request $request)
    {
        $lastSyncAt = $request->input('last_sync_at') ? Carbon::parse($request->input('last_sync_at')) : null;

        return response()->json([
            'success' => true,
            'server_time' => now()->toIso8601String(),
            'last_sync' => now()->toIso8601String(),
            'companies' => $this->getCompanies($lastSyncAt),
            'branches' => $this->getBranches($lastSyncAt),
            'currencies' => $this->getCurrencies($lastSyncAt),
            'countries' => $this->getCountries($lastSyncAt),
            'states' => $this->getStates($lastSyncAt),
            'cities' => $this->getCities($lastSyncAt),
            'locations' => $this->getLocations($lastSyncAt),
            'customers' => $this->getCustomers($lastSyncAt),
            'suppliers' => $this->getSuppliers($lastSyncAt),
            'employees' => $this->getEmployees($lastSyncAt),
            'categories' => $this->getCategories($lastSyncAt),
            'brands' => $this->getBrands($lastSyncAt),
            'units' => $this->getUnits($lastSyncAt),
            'warehouses' => $this->getWarehouses($lastSyncAt),
            'payment_methods' => $this->getPaymentMethods($lastSyncAt),
            'taxes' => $this->getTaxes($lastSyncAt),
            'roles' => $this->getRoles($lastSyncAt),
            'permissions' => $this->getPermissions($lastSyncAt),
            'settings' => $this->getSettings($lastSyncAt),
            'translations' => $this->getTranslations($lastSyncAt),
            'deleted_records' => $this->getDeletedRecords($lastSyncAt),
        ]);
    }

    protected function getCompanies($lastSyncAt)
    {
        $query = DB::table('companies')->select('*');
        if ($lastSyncAt) {
            $query->where('updated_at', '>', $lastSyncAt);
        }
        return $query->get();
    }

    protected function getBranches($lastSyncAt)
    {
        $query = DB::table('branches')->select('*');
        if ($lastSyncAt) {
            $query->where('updated_at', '>', $lastSyncAt);
        }
        return $query->get();
    }

    protected function getCurrencies($lastSyncAt)
    {
        $query = DB::table('currencies')->select('*');
        if ($lastSyncAt) {
            $query->where('updated_at', '>', $lastSyncAt);
        }
        return $query->get();
    }

    protected function getCountries($lastSyncAt)
    {
        $query = DB::table('countries')->select('*');
        if ($lastSyncAt) {
            $query->where('updated_at', '>', $lastSyncAt);
        }
        return $query->get();
    }

    protected function getStates($lastSyncAt)
    {
        $query = DB::table('states')->select('*');
        if ($lastSyncAt) {
            $query->where('updated_at', '>', $lastSyncAt);
        }
        return $query->get();
    }

    protected function getCities($lastSyncAt)
    {
        $query = DB::table('cities')->select('*');
        if ($lastSyncAt) {
            $query->where('updated_at', '>', $lastSyncAt);
        }
        return $query->get();
    }

    protected function getLocations($lastSyncAt)
    {
        $query = DB::table('locations')->select('*');
        if ($lastSyncAt) {
            $query->where('updated_at', '>', $lastSyncAt);
        }
        return $query->get();
    }

    protected function getCustomers($lastSyncAt)
    {
        $query = DB::table('customers')->select('*');
        if ($lastSyncAt) {
            $query->where('updated_at', '>', $lastSyncAt);
        }
        return $query->get();
    }

    protected function getSuppliers($lastSyncAt)
    {
        $query = DB::table('suppliers')->select('*');
        if ($lastSyncAt) {
            $query->where('updated_at', '>', $lastSyncAt);
        }
        return $query->get();
    }

    protected function getEmployees($lastSyncAt)
    {
        $query = DB::table('employees')->select('*');
        if ($lastSyncAt) {
            $query->where('updated_at', '>', $lastSyncAt);
        }
        return $query->get();
    }

    protected function getCategories($lastSyncAt)
    {
        $query = DB::table('categories')->select('*');
        if ($lastSyncAt) {
            $query->where('updated_at', '>', $lastSyncAt);
        }
        return $query->get();
    }

    protected function getBrands($lastSyncAt)
    {
        $query = DB::table('brands')->select('*');
        if ($lastSyncAt) {
            $query->where('updated_at', '>', $lastSyncAt);
        }
        return $query->get();
    }

    protected function getUnits($lastSyncAt)
    {
        $query = DB::table('item_units')->select('*');
        if ($lastSyncAt) {
            $query->where('updated_at', '>', $lastSyncAt);
        }
        return $query->get();
    }

    protected function getWarehouses($lastSyncAt)
    {
        $query = DB::table('warehouses')->select('*');
        if ($lastSyncAt) {
            $query->where('updated_at', '>', $lastSyncAt);
        }
        return $query->get();
    }

    protected function getPaymentMethods($lastSyncAt)
    {
        return [];
    }

    protected function getTaxes($lastSyncAt)
    {
        $query = DB::table('taxes')->select('*');
        if ($lastSyncAt) {
            $query->where('updated_at', '>', $lastSyncAt);
        }
        return $query->get();
    }

    protected function getRoles($lastSyncAt)
    {
        $query = DB::table('roles')->select('*');
        if ($lastSyncAt) {
            $query->where('updated_at', '>', $lastSyncAt);
        }
        return $query->get();
    }

    protected function getPermissions($lastSyncAt)
    {
        return [];
    }

    protected function getSettings($lastSyncAt)
    {
        return [];
    }

    protected function getTranslations($lastSyncAt)
    {
        $query = DB::table('language_lines')->select('*');
        if ($lastSyncAt) {
            $query->where('updated_at', '>', $lastSyncAt);
        }
        return $query->get();
    }

    protected function getDeletedRecords($lastSyncAt)
    {
        $deleted = [
            'customers' => [],
            'suppliers' => [],
            'products' => []
        ];

        if ($lastSyncAt) {
            $deleted['customers'] = DB::table('customers')
                ->onlyTrashed()
                ->where('deleted_at', '>', $lastSyncAt)
                ->pluck('id');
            $deleted['suppliers'] = DB::table('suppliers')
                ->onlyTrashed()
                ->where('deleted_at', '>', $lastSyncAt)
                ->pluck('id');
        }

        return $deleted;
    }
}
