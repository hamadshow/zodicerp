<?php

namespace App\Http\Controllers\Purchases;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Illuminate\Http\Request;

class SupplierOpeningBalanceController extends Controller
{
    public function index()
    {
        return Inertia::render('Backend/04-Purchases/Suppliers/OpeningBalances/Index');
    }
}
