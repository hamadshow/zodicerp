<?php

namespace App\Http\Controllers\Purchases;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Illuminate\Http\Request;

class PurchaseDiscountController extends Controller
{
    public function index()
    {
        return Inertia::render('Backend/04-Purchases/Discounts/Index');
    }

    public function rules()
    {
        return Inertia::render('Backend/04-Purchases/Discounts/Rules');
    }
}
