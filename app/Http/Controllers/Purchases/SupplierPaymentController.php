<?php

namespace App\Http\Controllers\Purchases;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Illuminate\Http\Request;

class SupplierPaymentController extends Controller
{
    public function index()
    {
        return Inertia::render('Backend/04-Purchases/Payments/Index');
    }

    public function create()
    {
        return Inertia::render('Backend/04-Purchases/Payments/Create');
    }

    public function reconciliation()
    {
        return Inertia::render('Backend/04-Purchases/Payments/Reconciliation');
    }

    public function allocation()
    {
        return Inertia::render('Backend/04-Purchases/Payments/Allocation');
    }
}
