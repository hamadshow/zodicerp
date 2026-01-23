<?php

namespace App\Http\Controllers\Purchases;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Illuminate\Http\Request;

class PurchaseOrderController extends Controller
{
    public function index()
    {
        return Inertia::render('Backend/04-Purchases/Orders/Index');
    }

    public function create()
    {
        return Inertia::render('Backend/04-Purchases/Orders/Create');
    }

    public function store(Request $request)
    {
        // TODO: Implement store logic
    }

    public function tracking()
    {
        return Inertia::render('Backend/04-Purchases/Orders/Tracking');
    }
}
