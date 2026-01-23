<?php

namespace App\Http\Controllers\Purchases;

use App\Http\Controllers\Controller;
use Inertia\Inertia;

class PurchaseDashboardController extends Controller
{
    public function index()
    {
        return Inertia::render('Backend/04-Purchases/Dashboard');
    }
}
