<?php

namespace App\Http\Controllers\Purchases;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Illuminate\Http\Request;

class PurchaseExpenseController extends Controller
{
    public function index()
    {
        return Inertia::render('Backend/04-Purchases/Expenses/Index');
    }
}
